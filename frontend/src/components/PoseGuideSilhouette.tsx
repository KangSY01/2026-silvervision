import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { POSE_SILHOUETTES, SILHOUETTE_ANCHORS, type PoseName } from '@/pose/exercise';
import { mapNormalizedToScreen, type Layout } from '@/pose/screenMapping';

// 카메라 프리뷰 위에 목표 자세를 반투명 실루엣으로 겹쳐 보여주는 가이드.
// 이미지 자체(pose-silhouettes/*.png)는 배경이 완전 투명이라, 이 opacity는
// 사람 형태 부분에만 적용돼 "은은하게 비치는 안내선" 느낌을 준다.
const GUIDE_OPACITY = 0.45;

// 라이브 엉덩이/어깨 landmark가 사라졌을 때, 곧바로 숨기지 않고 마지막 위치/크기를
// 이만큼(ms) 고정해서 보여준다 — 잠깐 프레임 밖으로 나가거나 자세가 흔들려도
// 가이드가 깜빡이지 않게 하기 위함. 이 시간을 넘기면 숨긴다.
const FREEZE_GRACE_MS = 1000;

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const MIN_VISIBILITY = 0.5; // PoseDot과 동일 기준 — 라이브 점이 보이는 조건과 맞춘다.

type Landmark = { x: number; y: number; z: number; visibility: number; presence: number };

type FrozenStyle = { left: number; top: number; width: number; height: number };

type Props = {
  poseName: PoseName | null;
  landmarksShared: SharedValue<Landmark[]>;
  layoutShared: SharedValue<Layout>;
  mirror: boolean;
};

export default function PoseGuideSilhouette({
  poseName,
  landmarksShared,
  layoutShared,
  mirror,
}: Props) {
  // Hook은 항상 같은 순서로 호출돼야 하므로, 이 두 SharedValue는 poseName이 null이어도
  // 만들어둔다(아래 애니메이션 스타일 자체는 poseName이 있을 때만 실제로 렌더된다).
  const lastValidAtMs = useSharedValue(0); // 0 = "아직 한 번도 안 잡힘"
  const frozenStyle = useSharedValue<FrozenStyle | null>(null);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (poseName == null) return { opacity: 0 };

    const anchor = SILHOUETTE_ANCHORS[poseName];
    const layout = layoutShared.value;
    const landmarks = landmarksShared.value;
    const hipL = landmarks[L_HIP];
    const hipR = landmarks[R_HIP];
    const shL = landmarks[L_SHOULDER];
    const shR = landmarks[R_SHOULDER];

    const valid =
      hipL != null &&
      hipR != null &&
      shL != null &&
      shR != null &&
      hipL.visibility >= MIN_VISIBILITY &&
      hipR.visibility >= MIN_VISIBILITY &&
      shL.visibility >= MIN_VISIBILITY &&
      shR.visibility >= MIN_VISIBILITY &&
      layout.width > 0 &&
      layout.height > 0;

    if (valid) {
      const screenHipL = mapNormalizedToScreen(hipL.x, hipL.y, layout, mirror);
      const screenHipR = mapNormalizedToScreen(hipR.x, hipR.y, layout, mirror);
      const screenShL = mapNormalizedToScreen(shL.x, shL.y, layout, mirror);
      const screenShR = mapNormalizedToScreen(shR.x, shR.y, layout, mirror);

      const hipMidX = (screenHipL.x + screenHipR.x) / 2;
      const hipMidY = (screenHipL.y + screenHipR.y) / 2;
      const liveShoulderWidthPx = Math.hypot(
        screenShR.x - screenShL.x,
        screenShR.y - screenShL.y,
      );

      if (liveShoulderWidthPx > 0 && anchor.shoulderWidthPx > 0) {
        const scale = liveShoulderWidthPx / anchor.shoulderWidthPx;
        const style: FrozenStyle = {
          left: hipMidX - anchor.hipPx.x * scale,
          top: hipMidY - anchor.hipPx.y * scale,
          width: anchor.imageWidth * scale,
          height: anchor.imageHeight * scale,
        };
        frozenStyle.value = style;
        lastValidAtMs.value = Date.now();
        return { opacity: GUIDE_OPACITY, ...style };
      }
    }

    // 이번 프레임엔 못 잡음 — 한 번도 잡힌 적 없으면 계속 숨김.
    if (lastValidAtMs.value === 0 || frozenStyle.value == null) {
      return { opacity: 0 };
    }
    // 잡혔다가 놓친 경우: 유예 시간 안에는 마지막 위치/크기 그대로 고정.
    if (Date.now() - lastValidAtMs.value < FREEZE_GRACE_MS) {
      return { opacity: GUIDE_OPACITY, ...frozenStyle.value };
    }
    return { opacity: 0 };
  });

  if (poseName == null) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image
        source={POSE_SILHOUETTES[poseName]}
        resizeMode="contain"
        style={[styles.image, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    opacity: 0,
  },
});
