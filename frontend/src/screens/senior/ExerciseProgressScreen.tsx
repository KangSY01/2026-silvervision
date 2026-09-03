import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  apiClient,
  ExerciseMissionResponse,
  ExerciseSessionResponse,
  getSession,
} from '../../api/client';
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

  // 세션 시작(POST /sessions/) 성공 시의 session_id. 렌더와 무관하게 핸들러에서
  // 최신 값을 읽어야 해 ref로 보관한다. 생성 실패 시 null로 남고, 결과 화면이
  // 완료 PATCH·피드백 POST를 건너뛴다.
  const sessionIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
        // 세션 시작 실패 시에도 운동 화면 자체(카메라/스켈레톤 UI - 비전팀 영역)는
        // 그대로 동작하게 둔다. sessionId가 null로 남아 결과 화면이 완료 저장을
        // 건너뛸 뿐이며, 이번 배치에서 재시도 UI는 넣지 않는다(연동 배선만).
        sessionIdRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
    // 진입 시 1회만 실행(위 가드가 재실행을 막는다). workout은 이 화면 수명 동안
    // 바뀌지 않으므로 deps에서 제외한다(아래 타이머 effect와 동일).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // completion_rate 임시 산정: 타이머를 끝까지 채우면 100, "건너뛰기"로 일찍
  // 나가면 진행한 비율. 타이머 경과율은 실제 사용자 행동에서 나온 값이라 지어낸
  // 수치가 아니다.
  // TODO(vision): completion_rate를 실제 관절 분석 기반 동작 완성도로 교체 필요
  // (지금은 타이머 경과율을 임시로 사용).
  const goToFeedback = (secondsRemaining: number) => {
    const completionRate = Math.max(
      0,
      Math.min(
        100,
        Math.round(((TOTAL_SECONDS - secondsRemaining) / TOTAL_SECONDS) * 100),
      ),
    );
    navigation.navigate('ExerciseFeedback', {
      workout,
      sessionId: sessionIdRef.current,
      completionRate,
    });
  };

  // X 버튼 이탈: goBack()만 한다. 세션은 completion_rate 없이 미완료 상태로
  // 남는다 - 백엔드가 completion_rate가 채워진 세션만 "완료"로 집계하므로
  // (gamification._completed_sessions) 별도 정리 API 없이도 열매/순위에
  // 반영되지 않는다. 미완료 세션 row가 남는 건 무해하고 오히려 시도 이력이라,
  // 정리 엔드포인트를 호출하는 건 과설계라고 판단했다.
  const handleExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    navigation.goBack();
  };

  const handleFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    goToFeedback(secondsLeft);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          goToFeedback(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = timer;

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
