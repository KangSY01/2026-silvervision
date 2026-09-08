import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
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
import {
  apiClient,
  EmergencyEventResponse,
  ExerciseMissionResponse,
  ExerciseSessionResponse,
  getSession,
} from '../../api/client';
import EmergencyCheckOverlay from '../../components/EmergencyCheckOverlay';
import PoseGuideSilhouette from '../../components/PoseGuideSilhouette';
import { RootStackParamList } from '../../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';
import {
  ExercisePipeline,
  JOINT_ANGLE_DEFS,
  WORKOUT_MATCH_TARGETS,
  type ExerciseStatus,
} from '@/pose/exercise';
import { FallPipeline, type FallPhase } from '@/pose/fall';
import { mapNormalizedToScreen, type Layout } from '@/pose/screenMapping';

const NUM_LANDMARKS = 33;
const TARGET_FPS = 10;
const SMOOTHING_WINDOW = 3;
const DISPLAY_UPDATE_INTERVAL_MS = 150;

// ============================================================
// Native plugin binding (VideoTensor/src/app/index.tsx와 동일)
// ============================================================
const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectPose', {});

type Landmark = { x: number; y: number; z: number; visibility: number; presence: number };

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

    if (!lm || lm.visibility < 0.5 || layout.width === 0 || layout.height === 0) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    }

    const { x: screenX, y: screenY } = mapNormalizedToScreen(lm.x, lm.y, layout, mirror);

    return {
      opacity: 1,
      transform: [{ translateX: screenX - 3 }, { translateY: screenY - 3 }],
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

type Route = NativeStackScreenProps<RootStackParamList, 'ExerciseProgress'>['route'];

export default function ExerciseProgressScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const { workout } = params;

  const startTimeRef = useRef(Date.now());

  // 세션 시작(POST /sessions/) 성공 시의 session_id. 렌더와 무관하게 핸들러에서
  // 최신 값을 읽어야 해 ref로 보관한다. 생성 실패 시 null로 남고, 결과 화면이
  // 완료 PATCH·피드백 POST를 건너뛴다.
  const sessionIdRef = useRef<number | null>(null);
  // StrictMode/개발 모드에서 아래 세션 시작 effect가 두 번 실행돼도 미션·세션이
  // 중복 생성되지 않게 막는 가드. sessionIdRef는 생성 "결과" 저장용일 뿐 재실행을
  // 막지 못한다(세션 생성이 끝나기 전 effect가 재실행되면 그때 ref는 아직 null).
  const sessionStartRequestedRef = useRef(false);

  // 화면 진입 시 세션을 자동으로 시작한다.
  // ExerciseSessionStartSerializer가 mission을 필수로 받고 exercise를 mission에서
  // 파생시키는데, 현재 화면 흐름(운동 카드 탭 → 바로 이 화면)엔 미션 생성 단계가
  // 없다. 그래서 여기서 먼저 scheduled_at=now로 미션을 만들고(사용자에게 안 보임)
  // 그 mission_id로 세션을 시작하는 2단계 체인으로 처리한다 - 세션 생명주기
  // (시작=진입, 완료=결과 화면 도달)를 이 흐름 안에서만 관리하기 위해 선택 화면이
  // 아니라 이 화면 mount 시점에 둔다.
  useEffect(() => {
    // 첫 실행에서만 통과시키고 이후(StrictMode 재마운트 등) 실행은 즉시 반환해
    // POST /missions/·POST /sessions/ 재호출을 막는다.
    if (sessionStartRequestedRef.current) return;
    sessionStartRequestedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (!session || cancelled) return;
        const mission = await apiClient.post<ExerciseMissionResponse>(
          `/senior/${session.userId}/missions/`,
          // senior는 ExerciseMissionCreateSerializer에서 필수 필드다(뷰가
          // request.user로 덮어쓰지만 검증 단계에서 값 존재는 요구한다). URL의
          // senior_id와 동일한 본인 id를 그대로 싣는다.
          {
            senior: session.userId,
            exercise: workout.id,
            scheduled_at: new Date().toISOString(),
          },
        );
        if (cancelled) return;
        const created = await apiClient.post<ExerciseSessionResponse>(
          `/senior/${session.userId}/sessions/`,
          { mission: mission.mission_id },
        );
        if (cancelled) return;
        sessionIdRef.current = created.session_id;
      } catch {
        // 세션 시작 실패 시에도 카메라 판정 자체는 그대로 동작하게 둔다.
        // sessionId가 null로 남아 결과 화면이 완료 저장을 건너뛸 뿐이며,
        // 재시도 UI는 이번 배치 범위 밖(연동 배선만).
        sessionIdRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
    // 진입 시 1회만 실행(위 가드가 재실행을 막는다). workout은 이 화면 수명 동안
    // 바뀌지 않으므로 deps에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // 카메라/파이프라인 (VideoTensor/src/app/index.tsx 이식)
  // ============================================================
  // 기기에 전면 초광각 렌즈가 있으면 그쪽을 우선 사용 - 화각이 더 넓다(없으면 기존 전면 렌즈로 자동 대체됨).
  const device = useCameraDevice('front', {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera'],
  });
  const { hasPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const format = useCameraFormat(device, [
    { videoAspectRatio: 4 / 3 },
    { videoResolution: { width: 1280, height: 960 } },
  ]);

  const tflite = useTensorflowModel(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/assets/models/fall_cnn_quant.tflite'),
    [],
  );

  const landmarksShared = useSharedValue<Landmark[]>([]);
  const layoutShared = useSharedValue<Layout>({ width: 0, height: 0 });

  const worldRawFramesRef = useRef<Landmark[][]>([]);
  const fallPipelineRef = useRef<FallPipeline | null>(null);
  const exercisePipelineRef = useRef(new ExercisePipeline(workout.poseWorkoutKey));
  const fallAlertSentRef = useRef(false);

  const [fallPhase, setFallPhase] = useState<FallPhase>('idle');
  const [fallProb, setFallProb] = useState(0);
  const [exerciseStatus, setExerciseStatus] = useState<ExerciseStatus>('idle');
  const [exerciseStepIndex, setExerciseStepIndex] = useState(0);
  const [exerciseHoldElapsedMs, setExerciseHoldElapsedMs] = useState(0);
  // 낙상 확정 시 POST /emergency/ 로 생성된 이벤트 id. 값이 있으면 1차 확인
  // 오버레이(EmergencyCheckOverlay)를 띄운다.
  const [emergencyEventId, setEmergencyEventId] = useState<number | null>(null);

  // ── 디버그 로깅 (임시) ────────────────────────────────────────────
  // 단계가 바뀔 때마다 "그 단계가 실제로 참조하는 기준 포즈"를 찍는다.
  // WORKOUT_MATCH_TARGETS는 매처가 쓰는 바로 그 배열이라, 여기 찍히는
  // poseName/각도가 판정에 쓰이는 값 그 자체다(화면 실루엣과 별개 경로가
  // 아님을 확인하려는 목적). 확인 끝나면 이 블록을 지운다.
  useEffect(() => {
    const steps = WORKOUT_MATCH_TARGETS[workout.poseWorkoutKey];
    const t = steps[exerciseStepIndex];
    if (t == null) {
      console.log(`[pose] ${workout.poseWorkoutKey} 완료 (${steps.length}단계)`);
      return;
    }
    const angles = JOINT_ANGLE_DEFS
      .map((d, i) => [d.name, t.refAngles[i]] as const)
      .filter(([, v]) => v != null)
      .map(([n, v]) => `${n}=${(v as number).toFixed(1)}`)
      .join(' ');
    console.log(
      `[pose] ${exerciseStepIndex + 1}/${steps.length} ` +
        `json=${t.poseName}.json hold=${t.holdMs}ms 기준각도[${angles}]`,
    );
  }, [exerciseStepIndex, workout.poseWorkoutKey]);
  // ─────────────────────────────────────────────────────────────────
  const lastExerciseHoldUpdateRef = useRef(0);
  const lastFallProbUpdateRef = useRef(0);

  useEffect(() => {
    exercisePipelineRef.current.start();
    setExerciseStatus('running');
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (tflite.state === 'loaded') {
      const model = tflite.model;
      fallPipelineRef.current = new FallPipeline((win) => {
        const outputs = model.runSync([win.buffer as ArrayBuffer]);
        return new Float32Array(outputs[0] as ArrayBuffer)[0];
      });
    } else {
      fallPipelineRef.current = null;
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
        let sx = 0, sy = 0, sz = 0, sv = 0, sp = 0, count = 0;
        for (let f = 0; f < frames; f++) {
          const p = buf[f][i];
          if (p == null) continue;
          sx += p.x; sy += p.y; sz += p.z; sv += p.visibility; sp += p.presence;
          count += 1;
        }
        out[i] = count === 0 ? lms[i] : { x: sx / count, y: sy / count, z: sz / count, visibility: sv / count, presence: sp / count };
      }
      return out;
    },
    [],
  );

  // X 버튼 이탈: goBack()만 한다. 세션은 completion_rate 없이 미완료 상태로
  // 남는다 - 백엔드가 completion_rate가 채워진 세션만 "완료"로 집계하므로
  // (gamification._completed_sessions) 별도 정리 API 없이도 열매/순위에
  // 반영되지 않는다. 미완료 세션 row가 남는 건 무해하고 오히려 시도 이력이라,
  // 정리 엔드포인트를 호출하는 건 과설계라고 판단했다.
  const handleExit = () => {
    navigation.goBack();
  };

  const handleFinish = useCallback(() => {
    const state = exercisePipelineRef.current.getState();
    // 시퀀스를 끝까지 마치면 pipeline이 stepIndex를 steps.length까지 올리고
    // status를 'complete'로 바꾸므로 completedSteps/totalSteps가 100%가 된다.
    // 중간에 "완료"를 누르면 그때까지 통과한 단계 수만 집계된다.
    const completedSteps = state.stepIndex;
    const totalSteps = state.totalSteps;
    navigation.navigate('ExerciseFeedback', {
      workout,
      sessionId: sessionIdRef.current,
      result: {
        totalSteps,
        completedSteps,
        accuracyScore: Math.round((completedSteps / totalSteps) * 100),
        elapsedMs: Date.now() - startTimeRef.current,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout]);

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

      const smoothedWorldLandmarks = smoothLandmarks(worldLandmarks, worldRawFramesRef);
      const exerciseResult = exercisePipelineRef.current.onFrame(
        smoothedWorldLandmarks.length === NUM_LANDMARKS ? smoothedWorldLandmarks : null,
        now,
      );
      setExerciseStatus(exerciseResult.status);
      setExerciseStepIndex(exerciseResult.stepIndex);
      if (now - lastExerciseHoldUpdateRef.current >= DISPLAY_UPDATE_INTERVAL_MS) {
        lastExerciseHoldUpdateRef.current = now;
        setExerciseHoldElapsedMs(exerciseResult.holdElapsedMs);
      }

      const pipeline = fallPipelineRef.current;
      if (pipeline == null || width <= 0 || height <= 0) return;

      const raw: number[][] | null = detected
        ? landmarks.map((l) => [l.x, l.y, l.z, l.visibility])
        : null;

      const result = pipeline.onFrame(raw, timestampMs, width, height);
      if (result == null) return;

      setFallPhase(result.phase);
      if (now - lastFallProbUpdateRef.current >= DISPLAY_UPDATE_INTERVAL_MS) {
        lastFallProbUpdateRef.current = now;
        setFallProb(result.prob);
      }
    },
    [landmarksShared, smoothLandmarks],
  );

  // 낙상 확정(phase === 'fallen') 시 응급 이벤트를 1회만 생성한다.
  //
  // 감지 판정 자체는 온디바이스 FallPipeline이 이미 끝냈고, 여기서는 "감지됐다"는
  // 사실과 감지 출처만 백엔드에 기록한다 - EmergencyEventSerializer 주석이 말하는
  // AI 경계 그대로다. senior는 뷰가 토큰 본인으로 강제 주입하므로 body에 싣지 않고,
  // status도 서버 기본값('detected')에 맡긴다. 생성에 성공하면 그 event_id로
  // 1차 확인 오버레이(EmergencyCheckOverlay)를 띄운다 - 오버레이가 first_check
  // 전이와 false_alarm/notify 호출을 담당한다(기존 엔드포인트만 사용).
  useEffect(() => {
    if (fallPhase !== 'fallen') {
      fallAlertSentRef.current = false;
      return;
    }
    if (fallAlertSentRef.current) return;
    fallAlertSentRef.current = true;

    (async () => {
      try {
        const created = await apiClient.post<EmergencyEventResponse>('/emergency/', {
          event_type: 'fall',
          detection_source: `exercise:${workout.poseWorkoutKey}`,
        });
        setEmergencyEventId(created.event_id);
      } catch {
        // 이벤트 생성 실패가 운동 화면을 막지는 않게 조용히 넘어간다.
        // 이 낙상 구간에 대한 재시도는 하지 않는다 - fallPhase가 'fallen'으로
        // 유지되는 동안에는 이 effect가 다시 실행되지 않기 때문이다(값이 같아
        // setFallPhase가 리렌더를 일으키지 않는다). 낙상 상태가 풀렸다가 다시
        // 감지되면 위 가드가 초기화되어 새 이벤트를 시도한다.
        // 재시도 UI는 이번 배치 범위 밖(연동 배선만).
      }
    })();
  }, [fallPhase, workout.poseWorkoutKey]);

  const updateFromFrameOnJS = useMemo(() => Worklets.createRunOnJS(processFrame), [processFrame]);

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

  // 운동 시퀀스를 전부 완료하면 바로 결과 화면으로 이동한다.
  useEffect(() => {
    if (exerciseStatus === 'complete') {
      handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseStatus]);

  // 운동마다 스텝 수/홀드 시간이 다르므로(WORKOUT_POSE_SEQUENCES), 파이프라인 인스턴스에서 직접 조회한다.
  const { totalSteps, holdMs, targetPoseName } = exercisePipelineRef.current.getState();

  // 다음 자세로 넘어가기까지 남은 시간(초, 소수점 1자리). 아직 자세를 맞추기 전이면
  // 현재 단계가 채워야 할 전체 홀드 시간(holdMs)을 그대로 보여준다.
  const holdRemainingSec = Math.max(0, (holdMs - exerciseHoldElapsedMs) / 1000);
  const stepProgressPercent = (exerciseStepIndex / totalSteps) * 100;
  const holdProgressText =
    exerciseStatus !== 'running'
      ? '운동 완료!'
      : exerciseHoldElapsedMs > 0
        ? `자세 유지 중… ${(exerciseHoldElapsedMs / 1000).toFixed(1)}s / ${(holdMs / 1000).toFixed(1)}s`
        : '자세를 맞춰주세요';

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        onPress={handleExit}
        style={({ pressed }) => [styles.exitButton, pressed && styles.pressedOpacity]}
        accessibilityLabel="운동 종료 및 선택 화면으로 가기"
      >
        <Text style={styles.exitButtonText}>✕</Text>
      </Pressable>

      {/* Camera Preview Area */}
      <View
        style={styles.viewport}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          layoutShared.value = { width, height };
        }}
      >
        {device != null && hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            format={format}
            isActive={isActive}
            frameProcessor={frameProcessor}
            pixelFormat="rgb"
            zoom={device.minZoom}
          />
        ) : (
          <Text style={styles.cameraLoadingText}>카메라 준비 중…</Text>
        )}

        <PoseGuideSilhouette
          poseName={targetPoseName}
          landmarksShared={landmarksShared}
          layoutShared={layoutShared}
          mirror={device?.position === 'front'}
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

        <View style={styles.scanFrame} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* 실시간 홀드 진행 상태 (기존 정적 "일치 92%" 배지 대체) */}
        <View pointerEvents="none" style={styles.holdBadge}>
          <Text style={styles.holdBadgeText}>{holdProgressText}</Text>
        </View>

        {/* 디버깅용 낙상 확률 표기 (개발 빌드에서만 노출) */}
        {__DEV__ && (
          <View pointerEvents="none" style={styles.debugBadge}>
            <Text style={styles.debugBadgeText}>
              [DEV] 낙상 확률: {fallProb.toFixed(3)} ({fallPhase})
            </Text>
          </View>
        )}

        {/* 낙상 감지 시 당사자(시니어)에게도 즉시 표시 — 큰 움직임이 다시 감지되면 자동으로 사라진다. */}
        {fallPhase === 'fallen' && (
          <View pointerEvents="none" style={styles.fallAlertBanner}>
            <AlertTriangle size={32} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.fallAlertText}>낙상이 감지되었어요{'\n'}괜찮으신가요?</Text>
          </View>
        )}
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.controlBar}>
        <View style={styles.controlTopRow}>
          <View style={styles.workoutBadge}>
            <Text style={styles.workoutBadgeText}>{workout.name}</Text>
          </View>
          <Text style={styles.timerText}>{holdRemainingSec.toFixed(1)}초</Text>
        </View>

        <View style={styles.stepRow}>
          <Text style={styles.controlTitle}>
            {exerciseStatus === 'complete'
              ? '동작 완료!'
              : `동작 ${exerciseStepIndex + 1}/${totalSteps}단계`}
          </Text>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${stepProgressPercent}%` }]}
            />
          </View>
        </View>

        {/* 개발 빌드 전용 건너뛰기. 카메라 앞에서 실제로 동작을 다 하지 않고도
            결과 화면을 열어볼 수 있어야 해서 남기지만, 릴리즈에서는 숨긴다 -
            이 버튼으로 나가면 completion_rate가 0으로라도 채워져 백엔드가
            "완료 세션"으로 집계하고(gamification._completed_sessions는
            completion_rate is not null 기준) 열매까지 지급되기 때문이다.
            정상 경로는 시퀀스를 끝까지 마쳐 자동 이동하는 것이고, 중도 포기는
            X 버튼(handleExit)이다 - 그쪽은 completion_rate를 채우지 않아
            미완료로 남는다. */}
        {__DEV__ && (
          <Pressable
            onPress={handleFinish}
            style={({ pressed }) => [styles.finishButton, pressed && styles.pressedPrimary]}
          >
            <Text style={styles.finishButtonText}>동작 완료 및 결과 보기</Text>
            <Text style={styles.finishButtonSubText}>[dev] 건너뛰기</Text>
          </Pressable>
        )}
      </View>

      {/* 낙상 확정 시 1차 확인(괜찮으세요?) 오버레이. 화면 전체를 덮는다. */}
      {emergencyEventId != null && (
        <EmergencyCheckOverlay
          eventId={emergencyEventId}
          onClose={() => setEmergencyEventId(null)}
        />
      )}
    </SafeAreaView>
  );
}

const CORNER_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  exitButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitButtonText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  viewport: {
    flex: 1,
    backgroundColor: colors.cameraViewport,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraLoadingText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.targetGreen,
  },
  scanFrame: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderWidth: 4,
    borderColor: colors.primaryBorderStrong,
    borderRadius: 28,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.primaryLight,
  },
  cornerTL: {
    top: spacing.xl,
    left: spacing.xl,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: spacing.xl,
    right: spacing.xl,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: spacing.xl,
    left: spacing.xl,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: spacing.xl,
    right: spacing.xl,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  holdBadge: {
    position: 'absolute',
    top: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  holdBadgeText: {
    backgroundColor: colors.overlayDark,
    borderWidth: 1,
    borderColor: colors.overlayLightBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.white,
    overflow: 'hidden',
  },
  debugBadge: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  debugBadgeText: {
    backgroundColor: colors.overlayDark,
    borderWidth: 1,
    borderColor: colors.overlayLightBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.white,
    overflow: 'hidden',
  },
  fallAlertBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  fallAlertText: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 38,
  },
  controlBar: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.lg,
    zIndex: 30,
  },
  controlTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  workoutBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoftBackground,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  workoutBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.black,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  timerText: {
    fontSize: 24,
    fontWeight: fontWeights.black,
    color: colors.danger,
    letterSpacing: -0.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  controlTitle: {
    flexShrink: 0,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  progressTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.grayBadgeBackground,
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
  },
  finishButton: {
    minHeight: MIN_TOUCH_TARGET,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  finishButtonText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  finishButtonSubText: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
    color: colors.white,
    opacity: 0.8,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
