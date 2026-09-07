import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useFrameProcessor,
  VisionCameraProxy,
  type Frame,
} from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

import { ExercisePipeline, type ExerciseStatus } from '@/pose/exercise';
import { FallPipeline, type FallPhase } from '@/pose/fall';

// Phase 4 스모크 테스트 전용 화면. VideoTensor/src/app/index.tsx를 그대로 이식했으며
// expo-router의 <Stack.Screen> 대신 native-stack의 Screen options로 헤더를 숨긴다
// (App.tsx의 Stack.Screen 등록에서 options={{ headerShown: false }} 지정).

// ============================================================
// Native plugin binding
// ============================================================
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectPose', {});

type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence: number;
};

type DetectResult = {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  timestampMs: number;
  width: number;
  height: number;
};

function detectPose(frame: Frame): DetectResult | null {
  'worklet';
  if (plugin == null) throw new Error('detectPose plugin not loaded');
  return plugin.call(frame, {}) as unknown as DetectResult;
}

const NUM_LANDMARKS = 33;

type Layout = { width: number; height: number };

const TARGET_FPS = 10;
const SMOOTHING_WINDOW = 3;
const DISPLAY_UPDATE_INTERVAL_MS = 150;

function PoseDot({
  index,
  landmarksShared,
  layoutShared,
  mirror,
}: {
  index: number;
  landmarksShared: SharedValue<Landmark[]>;
  layoutShared: SharedValue<Layout>;
  mirror: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const layout = layoutShared.value;
    const landmarks = landmarksShared.value;
    const lm = landmarks[index];

    if (
      !lm ||
      lm.visibility < 0.5 ||
      layout.width === 0 ||
      layout.height === 0
    ) {
      return {
        opacity: 0,
        transform: [{ translateX: 0 }, { translateY: 0 }],
      };
    }

    const frameAspectRatio = 3 / 4;
    const containerAspect = layout.width / layout.height;

    let displayW: number;
    let displayH: number;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > frameAspectRatio) {
      displayW = layout.width;
      displayH = layout.width / frameAspectRatio;
      offsetY = (displayH - layout.height) / 2;
    } else {
      displayH = layout.height;
      displayW = layout.height * frameAspectRatio;
      offsetX = (displayW - layout.width) / 2;
    }

    // 전면 카메라는 프리뷰가 좌우 반전(셀피 미러)되어 보이는데, 네이티브가 돌려주는
    // 랜드마크 좌표는 반전되지 않은 원본 센서 기준이라 그대로 쓰면 점이 반대쪽에 찍힌다.
    const x = mirror ? 1 - lm.x : lm.x;
    const screenX = x * displayW - offsetX;
    const screenY = lm.y * displayH - offsetY;

    return {
      opacity: 1,
      transform: [
        { translateX: screenX - 2 },
        { translateY: screenY - 2 },
      ],
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function PoseSmokeTestScreen() {
  const navigation = useNavigation();
  const device = useCameraDevice('front', {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera'],
  });
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  const format = useCameraFormat(device, [
    { videoAspectRatio: 4 / 3 },
    { videoResolution: { width: 1280, height: 960 } },
  ]);

  useEffect(() => {
    if (format != null) {
      console.log(
        `[camera] format ${format.videoWidth}x${format.videoHeight} ` +
          `(aspect ${(format.videoWidth / format.videoHeight).toFixed(3)})`,
      );
    }
  }, [format]);

  const tflite = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/assets/models/fall_cnn_quant.tflite'),
    [],
  );

  const landmarksShared = useSharedValue<Landmark[]>([]);
  const layoutShared = useSharedValue<Layout>({ width: 0, height: 0 });

  const worldRawFramesRef = useRef<Landmark[][]>([]);
  const pipelineRef = useRef<FallPipeline | null>(null);
  const lastDisplayUpdateRef = useRef(0);
  const personVisibleRef = useRef(true);

  // 스모크 테스트용 화면이라 실제 운동 선택 없이 고정 워크아웃(stretching)으로 파이프라인을 돈다.
  const exercisePipelineRef = useRef(new ExercisePipeline('stretching'));
  const lastExerciseHoldUpdateRef = useRef(0);

  const [phase, setPhase] = useState<FallPhase>('idle');
  const [prob, setProb] = useState(0);
  const [consecutive, setConsecutive] = useState(0);
  const [personVisible, setPersonVisible] = useState(true);

  const [exerciseStatus, setExerciseStatus] = useState<ExerciseStatus>('idle');
  const [exerciseStepIndex, setExerciseStepIndex] = useState(0);
  const [exerciseHoldElapsedMs, setExerciseHoldElapsedMs] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (tflite.state === 'loaded') {
      const model = tflite.model;
      pipelineRef.current = new FallPipeline((win) => {
        const outputs = model.runSync([win.buffer as ArrayBuffer]);
        return new Float32Array(outputs[0] as ArrayBuffer)[0];
      });
    } else {
      pipelineRef.current = null;
    }
  }, [tflite]);

  const isActive = isFocused && appState === 'active';

  const smoothLandmarks = useCallback(
    (lms: Landmark[], bufferRef: React.RefObject<Landmark[][]>): Landmark[] => {
      if (lms.length === 0) {
        bufferRef.current = [];
        return lms;
      }

      const buf = bufferRef.current;
      buf.push(lms);
      if (buf.length > SMOOTHING_WINDOW) buf.shift();

      const frames = buf.length;
      const out: Landmark[] = new Array(lms.length);
      for (let i = 0; i < lms.length; i++) {
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let sv = 0;
        let sp = 0;
        let count = 0;
        for (let f = 0; f < frames; f++) {
          const p = buf[f][i];
          if (p == null) continue;
          sx += p.x;
          sy += p.y;
          sz += p.z;
          sv += p.visibility;
          sp += p.presence;
          count += 1;
        }
        out[i] =
          count === 0
            ? lms[i]
            : {
                x: sx / count,
                y: sy / count,
                z: sz / count,
                visibility: sv / count,
                presence: sp / count,
              };
      }
      return out;
    },
    [],
  );

  const processFrame = useCallback(
    (
      landmarks: Landmark[],
      worldLandmarks: Landmark[],
      timestampMs: number,
      width: number,
      height: number,
    ) => {
      // 화면 점 표기는 지연 없이 들어오는 원본 좌표를 그대로 그린다(스무딩 시 시각적 지연 발생).
      landmarksShared.value = landmarks;

      const now = Date.now();
      const detected = landmarks.length === NUM_LANDMARKS;

      if (personVisibleRef.current !== detected) {
        personVisibleRef.current = detected;
        setPersonVisible(detected);
      }

      const smoothedWorldLandmarks = smoothLandmarks(
        worldLandmarks,
        worldRawFramesRef,
      );
      const exerciseResult = exercisePipelineRef.current.onFrame(
        smoothedWorldLandmarks.length === NUM_LANDMARKS
          ? smoothedWorldLandmarks
          : null,
        now,
      );
      setExerciseStatus(exerciseResult.status);
      setExerciseStepIndex(exerciseResult.stepIndex);
      if (
        now - lastExerciseHoldUpdateRef.current >=
        DISPLAY_UPDATE_INTERVAL_MS
      ) {
        lastExerciseHoldUpdateRef.current = now;
        setExerciseHoldElapsedMs(exerciseResult.holdElapsedMs);
      }

      const pipeline = pipelineRef.current;
      if (pipeline == null || width <= 0 || height <= 0) return;

      const raw: number[][] | null = detected
        ? landmarks.map((l) => [l.x, l.y, l.z, l.visibility])
        : null;

      const result = pipeline.onFrame(raw, timestampMs, width, height);
      if (result == null) return;

      setPhase(result.phase);
      if (now - lastDisplayUpdateRef.current >= DISPLAY_UPDATE_INTERVAL_MS) {
        lastDisplayUpdateRef.current = now;
        setProb(result.prob);
        setConsecutive(result.consecutive);
      }
    },
    [landmarksShared, smoothLandmarks],
  );

  const handleStartExercise = useCallback(() => {
    exercisePipelineRef.current.start();
    setExerciseStatus('running');
    setExerciseStepIndex(0);
    setExerciseHoldElapsedMs(0);
  }, []);

  const updateFromFrameOnJS = useMemo(
    () => Worklets.createRunOnJS(processFrame),
    [processFrame],
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      try {
        runAtTargetFps(TARGET_FPS, () => {
          'worklet';
          const result = detectPose(frame);
          if (result != null) {
            updateFromFrameOnJS(
              result.landmarks,
              result.worldLandmarks,
              result.timestampMs,
              result.width,
              result.height,
            );
          }
        });
      } catch (e) {
        console.log(e);
      }
    },
    [updateFromFrameOnJS],
  );

  if (!hasPermission || device == null) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.text}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const statusText =
    tflite.state === 'loading'
      ? '모델 로딩 중…'
      : tflite.state === 'error'
        ? '모델 로드 실패'
        : phase === 'fallen'
          ? '낙상 감지'
          : !personVisible
            ? '사람 없음'
            : phase === 'candidate'
              ? '낙하 후보…'
              : '감시 중';

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          layoutShared.value = { width, height };
        }}
      >
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={isActive}
          frameProcessor={frameProcessor}
          pixelFormat="rgb"
          zoom={device.minZoom}
        />

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: NUM_LANDMARKS }).map((_, i) => (
            <PoseDot
              key={i}
              index={i}
              landmarksShared={landmarksShared}
              layoutShared={layoutShared}
              mirror={device?.position === 'front'}
            />
          ))}
        </View>

        <View pointerEvents="none" style={styles.popupContainer}>
          <View
            style={[
              styles.popup,
              phase === 'candidate' && styles.popupMonitoring,
              phase === 'fallen' && styles.popupFallen,
            ]}
          >
            <Text style={styles.popupValue}>
              낙상 확률:{' '}
              {tflite.state !== 'loaded' ||
              (!personVisible && phase !== 'fallen')
                ? '—'
                : `${prob.toFixed(3)}  (연속 ${consecutive})`}
            </Text>
            <Text style={styles.popupStatus}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.exerciseContainer}>
          <View style={styles.exerciseBox}>
            {exerciseStatus === 'idle' && (
              <Pressable
                style={styles.exerciseButton}
                onPress={handleStartExercise}
              >
                <Text style={styles.exerciseButtonText}>운동 시작</Text>
              </Pressable>
            )}
            {exerciseStatus === 'running' && (() => {
              const { targetPoseName, totalSteps, holdMs } = exercisePipelineRef.current.getState();
              return (
                <>
                  <Text style={styles.exerciseValue}>
                    목표: {targetPoseName} (
                    {exerciseStepIndex + 1}/{totalSteps})
                  </Text>
                  <Text style={styles.exerciseStatusText}>
                    {exerciseHoldElapsedMs > 0
                      ? `유지 중… ${(exerciseHoldElapsedMs / 1000).toFixed(1)} / ${(holdMs / 1000).toFixed(1)}s`
                      : '자세를 맞춰주세요'}
                  </Text>
                </>
              );
            })()}
            {exerciseStatus === 'complete' && (
              <>
                <Text style={styles.exerciseValue}>운동 완료!</Text>
                <Pressable
                  style={styles.exerciseButton}
                  onPress={handleStartExercise}
                >
                  <Text style={styles.exerciseButtonText}>다시 시작</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <Pressable
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>닫기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  text: { color: 'white', fontSize: 18, marginBottom: 20 },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'red',
  },
  popupContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 60,
  },
  popup: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupMonitoring: {
    backgroundColor: 'rgba(234, 179, 8, 0.9)',
  },
  popupFallen: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
  },
  popupValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  popupStatus: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  exerciseContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
  },
  exerciseBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  exerciseValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseStatusText: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  exerciseButton: {
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exerciseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
