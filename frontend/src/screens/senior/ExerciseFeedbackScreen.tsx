import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  apiClient,
  ExerciseSessionCompleteResponse,
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

type Route = NativeStackScreenProps<RootStackParamList, 'ExerciseFeedback'>['route'];

export default function ExerciseFeedbackScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const { workout, sessionId, result } = params;

  // 카메라 파이프라인이 집계한 실제 단계 진행률. 타이머 경과율이 아니라
  // ExercisePipeline이 통과 처리한 포즈 단계 수에서 나온다.
  const completionRate = Math.round(
    (result.completedSteps / result.totalSteps) * 100,
  );

  // 화면 도달 = "동작 완료" 시점. 여기서 세션 완료 PATCH를 한 번 수행한다
  // (X 버튼 이탈은 이 화면에 오지 않으므로 세션이 미완료로 남는 흐름과
  // 일관된다). sessionId가 null이면(세션 시작 실패) 조용히 건너뛴다.
  // 열매 지급 결과. 'pending'은 완료 PATCH가 아직 끝나지 않은 상태,
  // 'failed'는 저장 자체가 실패해 기록되지 않은 상태다.
  const [reward, setReward] = useState<
    | { state: 'pending' }
    | { state: 'failed' }
    | { state: 'done'; awarded: boolean; total: number; todayCompleted: number; dailyGoal: number }
  >(sessionId == null ? { state: 'failed' } : { state: 'pending' });

  useEffect(() => {
    if (sessionId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (!session || cancelled) {
          if (!cancelled) setReward({ state: 'failed' });
          return;
        }
        // accuracy_avg와 completion_rate는 지금 **같은 값**이다. 둘 다
        // completedSteps/totalSteps 비율이며, 관절 정확도가 아니라 "단계를
        // 몇 개 통과했는가"다. matcher.ts의 matchesPose()가 boolean만 반환해
        // 관절별 각도 편차를 노출하지 않기 때문이고, 화면 라벨도 이에 맞춰
        // '동작 완료율'로 적어 두었다(관절 편차 표시는 측정값이 없어 제거).
        // matcher가 각도 차이를 함께 반환하도록 확장되면 그때 두 값이 갈라진다.
        // 같은 값이라고 해서 저장이 잘못된 게 아니니 착각하지 말 것.
        const completed = await apiClient.patch<ExerciseSessionCompleteResponse>(
          `/senior/${session.userId}/sessions/${sessionId}/`,
          { completion_rate: completionRate, accuracy_avg: result.accuracyScore },
        );
        if (cancelled) return;
        // 지급 여부는 백엔드가 판단한다(하루 상한·중복 PATCH 처리 포함).
        // 프론트가 임의로 +1을 표시하지 않는다.
        setReward({
          state: 'done',
          awarded: completed.fruit_awarded,
          total: completed.fruit_count,
          todayCompleted: completed.today_completed,
          dailyGoal: completed.daily_goal,
        });
      } catch {
        // 저장 실패. 열매 카드가 "지급됐다"고 말하지 않도록 상태만 바꾼다.
        if (!cancelled) setReward({ state: 'failed' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 측정하지 않는 것(유연성·치매 예방 등)은 말하지 않는다. 아는 것은
  // "몇 단계를 통과했는가"뿐이므로 그것만 근거로 문구를 고른다.
  const evaluation =
    completionRate >= 100
      ? {
          title: '끝까지 완주하셨습니다!',
          description: `${workout.name} 동작 ${result.totalSteps}단계를 모두 따라 하셨어요. 이대로 꾸준히 이어가 보세요.`,
        }
      : completionRate >= 50
        ? {
            title: '잘하고 계세요!',
            description: `${result.totalSteps}단계 중 ${result.completedSteps}단계를 마치셨어요. 다음에는 끝까지 도전해 볼까요?`,
          }
        : {
            title: '오늘은 여기까지!',
            description: '무리하지 않으셔도 괜찮아요. 내일 다시 함께 시작해요.',
          };

  const handleConfirm = () => {
    // 홈 화면의 건강 나무는 오늘 완료 수(today_completed)를 쓴다. 위 useEffect의
    // 세션 완료 PATCH가 반영된 뒤 SeniorHomeScreen이 포커스 시 다시 조회한다.
    navigation.navigate('SeniorHome');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>운동 결과</Text>
        <Text style={styles.subtitle}>
          {workout.name} 동작을 끝까지 따라 하셨는지 확인했습니다.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 오늘의 진행도 카드. 한 세션의 completion_rate는 정상 경로에서 항상
            100이라(끝까지 마쳐야 이 화면에 도달) 보여줄 정보가 못 된다.
            대신 하루 목표 대비 오늘 몇 번 했는지를 보여준다. */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>오늘의 운동</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>
              {reward.state === 'done' ? reward.todayCompleted : '-'}
            </Text>
            <Text style={styles.scorePercent}>
              {reward.state === 'done' ? ` / ${reward.dailyGoal}` : ''}
            </Text>
          </View>

          <View style={styles.scoreTrack}>
            <LinearGradient
              colors={[colors.scoreGradientStart, colors.scoreGradientMid, colors.scoreGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.scoreFill,
                {
                  width:
                    reward.state === 'done'
                      ? `${Math.min(100, Math.round((reward.todayCompleted / reward.dailyGoal) * 100))}%`
                      : '0%',
                },
              ]}
            />
          </View>

          <View style={styles.scoreEvalBox}>
            <CheckCircle2 size={20} color={colors.primary} />
            <View style={styles.scoreEvalTextArea}>
              <Text style={styles.scoreEvalTitle}>{evaluation.title}</Text>
              <Text style={styles.scoreEvalDescription}>{evaluation.description}</Text>
            </View>
          </View>
        </View>

        {/* 열매 보상 카드 - 지급 여부는 백엔드 응답(fruit_awarded)이 정한다.
            하루 상한에 걸렸거나 저장이 실패했으면 "+1"을 띄우지 않는다. */}
        <LinearGradient
          colors={[colors.amberBackground, colors.amberGradientEnd]}
          style={styles.rewardCard}
        >
          <View style={styles.rewardIconBox}>
            <Text style={styles.rewardIconText}>🍎</Text>
            {reward.state === 'done' && reward.awarded ? (
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardBadgeText}>+1</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.rewardTextArea}>
            <View style={styles.rewardTitleRow}>
              <Sparkles size={18} color={colors.amberFill} fill={colors.amberFill} />
              <Text style={styles.rewardTitle}>
                {reward.state === 'pending'
                  ? '운동 기록을 저장하는 중...'
                  : reward.state === 'failed'
                    ? '기록을 저장하지 못했습니다'
                    : reward.awarded
                      ? '건강 열매 1개 수확 성공!'
                      : '오늘 받을 열매를 모두 모으셨어요'}
              </Text>
            </View>
            <Text style={styles.rewardDescription}>
              {reward.state === 'pending'
                ? '잠시만 기다려 주세요.'
                : reward.state === 'failed'
                  ? '네트워크 상태를 확인해 주세요. 이번 운동은 기록에 반영되지 않았습니다.'
                  : reward.awarded
                    ? `운동이 기록에 반영되어 건강 나무에 열매가 새로 열렸습니다. (총 ${reward.total}개)`
                    : `오늘의 열매를 이미 다 받으셨습니다. 운동 기록은 그대로 남아요. (총 ${reward.total}개)`}
            </Text>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Primary Confirm Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.confirmButtonText}>
            {reward.state === 'done' && reward.awarded
              ? '열매 챙겨서 나무 보러가기'
              : '건강 나무 보러가기'}
          </Text>
          <Text style={styles.confirmButtonArrow}>➔</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md + spacing.xs,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: fontWeights.black,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  scorePercent: {
    fontSize: 24,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  scoreTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.grayBadgeBackground,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 5,
  },
  scoreEvalBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.emeraldSoftBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  scoreEvalTextArea: {
    flex: 1,
  },
  scoreEvalTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  scoreEvalDescription: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 26,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.amberCardBorder,
    padding: spacing.md + spacing.xs,
  },
  rewardIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.amberFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconText: {
    fontSize: 30,
  },
  rewardBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  rewardTextArea: {
    flex: 1,
  },
  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.amberTextDeep,
  },
  rewardDescription: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.amberText,
    marginTop: spacing.xs,
    lineHeight: 26,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confirmButton: {
    minHeight: MIN_TOUCH_TARGET,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  confirmButtonArrow: {
    fontSize: 18,
    color: colors.white,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
});
