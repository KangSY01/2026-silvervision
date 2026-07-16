import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { RootStackParamList } from '../../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';

const TOTAL_SECONDS = 30;

function formatTime(totalSecs: number) {
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `0${mins}:${String(secs).padStart(2, '0')}`;
}

type Route = NativeStackScreenProps<RootStackParamList, 'ExerciseProgress'>['route'];

export default function ExerciseProgressScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const { workout } = params;
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  const handleExit = () => {
    navigation.goBack();
  };

  const handleFinish = () => {
    navigation.navigate('ExerciseFeedback', { workout });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPercent = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100;

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.topBanner}>
        <View style={styles.recordingRow}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>AI 안심 카메라 동작 분석 중</Text>
        </View>
        <Pressable
          onPress={handleExit}
          style={({ pressed }) => [styles.exitButton, pressed && styles.pressedOpacity]}
          accessibilityLabel="운동 종료 및 선택 화면으로 가기"
        >
          <Text style={styles.exitButtonText}>✕</Text>
        </Pressable>
      </View>

      {/* Camera Preview Area */}
      <View style={styles.viewport}>
        <View style={styles.scanFrame} pointerEvents="none" />
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Target posture guide */}
        <View style={styles.targetCard}>
          <Text style={styles.targetLabel}>따라할 올바른 자세</Text>
          <View style={styles.targetBox}>
            <Svg width={80} height={96} viewBox="0 0 100 120">
              <Circle cx={50} cy={25} r={8} stroke={colors.targetGreen} strokeWidth={3} fill="none" />
              <Line x1={50} y1={33} x2={50} y2={70} stroke={colors.targetGreen} strokeWidth={3} />
              <Line x1={50} y1={42} x2={25} y2={15} stroke={colors.targetGreen} strokeWidth={3} />
              <Line x1={50} y1={42} x2={75} y2={15} stroke={colors.targetGreen} strokeWidth={3} />
              <Line x1={50} y1={70} x2={35} y2={105} stroke={colors.targetGreen} strokeWidth={3} />
              <Line x1={50} y1={70} x2={65} y2={105} stroke={colors.targetGreen} strokeWidth={3} />
            </Svg>
          </View>
          <Text style={styles.targetCaption}>어깨 가볍게 펴기</Text>
        </View>

        {/* Main skeleton guide (정적 자세 — motion 애니메이션 제외) */}
        <View style={styles.skeletonWrap}>
          <Svg width="100%" height="100%" viewBox="0 0 200 240" style={styles.skeletonSvg}>
            {/* 스캔 라인 */}
            <Line
              x1={0}
              y1={80}
              x2={200}
              y2={80}
              stroke={colors.primaryLight}
              strokeWidth={2.5}
              strokeDasharray="3,3"
              opacity={0.6}
            />

            {/* 머리 */}
            <Circle cx={100} cy={50} r={16} fill="none" stroke={colors.primaryLight} strokeWidth={4} />
            <Circle cx={100} cy={50} r={4} fill={colors.primaryLight} />

            {/* 몸통 */}
            <Line x1={100} y1={66} x2={100} y2={140} stroke={colors.primaryLight} strokeWidth={4} strokeLinecap="round" />

            {/* 팔 */}
            <Line x1={100} y1={80} x2={40} y2={90} stroke={colors.primaryLight} strokeWidth={4} strokeLinecap="round" />
            <Line x1={100} y1={80} x2={160} y2={90} stroke={colors.primaryLight} strokeWidth={4} strokeLinecap="round" />

            {/* 다리 */}
            <Line x1={100} y1={140} x2={70} y2={210} stroke={colors.primaryLight} strokeWidth={4} strokeLinecap="round" />
            <Line x1={100} y1={140} x2={130} y2={210} stroke={colors.primaryLight} strokeWidth={4} strokeLinecap="round" />

            {/* 관절 포인트 */}
            <Circle cx={100} cy={80} r={6} fill={colors.primaryLight} opacity={0.35} />
            <Circle cx={100} cy={80} r={4} fill={colors.primary} />
            <Circle cx={40} cy={90} r={6} fill={colors.primaryLight} />
            <Circle cx={160} cy={90} r={6} fill={colors.primaryLight} />
            <Circle cx={70} cy={210} r={6} fill={colors.primaryLight} />
            <Circle cx={130} cy={210} r={6} fill={colors.primaryLight} />

            {/* 일치율 배지 */}
            <Rect x={155} y={78} width={42} height={16} rx={4} fill={colors.primary} opacity={0.9} />
            <SvgText x={176} y={90} textAnchor="middle" fill={colors.white} fontSize={9} fontWeight="bold">
              일치 92%
            </SvgText>
          </Svg>
        </View>

        {/* Safety warning */}
        <View style={styles.warningBanner}>
          <AlertCircle size={22} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.warningText}>
            의자가 흔들리지 않는지 확인하고 꼭 안전하게 진행해 주세요!
          </Text>
        </View>
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.controlBar}>
        <View style={styles.controlTopRow}>
          <View style={styles.controlInfo}>
            <View style={styles.workoutBadge}>
              <Text style={styles.workoutBadgeText}>{workout.name}</Text>
            </View>
            <Text style={styles.controlTitle}>동작 따라하기 단계</Text>
          </View>

          <View style={styles.timerArea}>
            <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
            <Text style={styles.timerCaption}>남은 시간</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>

        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [styles.finishButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.finishButtonText}>동작 완료 및 결과 보기</Text>
          <Text style={styles.finishButtonSubText}>(또는 건너뛰기)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const CORNER_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  topBanner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 30,
    backgroundColor: colors.overlayDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.overlayLight,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  exitButton: {
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
  targetCard: {
    position: 'absolute',
    bottom: 128,
    left: spacing.xl,
    zIndex: 20,
    width: 128,
    backgroundColor: colors.overlayDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.overlayLightBorder,
    padding: spacing.sm + spacing.xs,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: fontWeights.black,
    color: '#D1D5DB',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  targetBox: {
    width: 80,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.cameraViewportDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCaption: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primaryLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  skeletonWrap: {
    width: '100%',
    height: '100%',
    maxHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  skeletonSvg: {
    maxWidth: 280,
  },
  warningBanner: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 25,
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.lg,
    padding: spacing.md - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.white,
    lineHeight: 26,
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
  controlInfo: {
    flexShrink: 1,
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
  controlTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  timerArea: {
    alignItems: 'flex-end',
  },
  timerText: {
    fontSize: 24,
    fontWeight: fontWeights.black,
    color: colors.danger,
    letterSpacing: -0.5,
  },
  timerCaption: {
    fontSize: 12,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  progressTrack: {
    width: '100%',
    height: 14,
    backgroundColor: colors.grayBadgeBackground,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: spacing.lg,
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
