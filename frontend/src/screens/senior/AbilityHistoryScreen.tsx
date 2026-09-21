import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ArrowLeft, ClipboardList } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  apiClient,
  ExerciseResponse,
  ExerciseSessionResponse,
  getSession,
} from '../../api/client';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';

type LoadState = 'loading' | 'ready' | 'error';

// 체감 난이도 자가평가(1~5) → 표시 라벨. null은 평가를 건너뛴 세션(과거 세션 포함).
// Record 패턴은 ExerciseSelectScreen의 DIFFICULTY_LABELS와 동일 - enum이 늘면
// 컴파일 타임에 누락이 드러난다.
const PERCEIVED_DIFFICULTY_LABELS: Record<1 | 2 | 3 | 4 | 5, { emoji: string; label: string }> = {
  1: { emoji: '😊', label: '매우 쉬웠다' },
  2: { emoji: '🙂', label: '쉬웠다' },
  3: { emoji: '😐', label: '할만했다' },
  4: { emoji: '😓', label: '힘들었다' },
  5: { emoji: '😣', label: '매우 힘들었다' },
};

// created_at(ISO) → "2026. 09. 21 10:15" 형태. 파싱 실패 시 원문을 그대로 반환.
function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function AbilityHistoryScreen() {
  const navigation = useNavigation();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [sessions, setSessions] = useState<ExerciseSessionResponse[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<number, string>>({});

  // 진입/복귀마다 재조회(다른 시니어 연동 화면과 동일 패턴). 최초만 'loading'을
  // 노출하고, 이후 포커스 재조회는 기존 화면을 둔 채 조용히 갱신한다.
  const load = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const [sessionRes, exerciseRes] = await Promise.all([
        apiClient.get<ExerciseSessionResponse[]>(`/senior/${session.userId}/sessions/`),
        apiClient.get<ExerciseResponse[]>('/exercises/'),
      ]);
      setSessions(sessionRes);
      // 세션 목록에는 운동 이름이 nested 안 되어 있어(exercise PK만) 별도 매핑
      // (SeniorDetailScreen과 동일 패턴).
      setExerciseNames(
        Object.fromEntries(exerciseRes.map((ex) => [ex.exercise_id, ex.name])),
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 완료된 세션만 "운동 기록"으로 보여준다(진행 중 이탈로 남은 미완료 세션은
  // 제외 - ExerciseFeedbackScreen이 완료 시에만 completion_rate를 채운다).
  // 최신순으로 정렬.
  const completedSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.completion_rate !== null)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [sessions],
  );

  const handleBack = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>홈으로</Text>
        </Pressable>

        <Text style={styles.title}>내 운동 기록</Text>
        <Text style={styles.subtitle}>
          최근에 어떤 운동을 하셨는지, 얼마나 힘드셨는지 확인해요.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loadState === 'loading' ? (
          <Text style={styles.stateText}>기록을 불러오는 중입니다...</Text>
        ) : loadState === 'error' ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>
              기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </Text>
            <Pressable
              onPress={() => void load()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedPrimary]}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : completedSessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <ClipboardList size={32} color={colors.disabledText} strokeWidth={2} />
            <Text style={styles.emptyTitle}>아직 완료한 운동이 없어요</Text>
            <Text style={styles.emptyText}>운동을 끝까지 완료하시면 여기에 기록이 쌓여요.</Text>
          </View>
        ) : (
          completedSessions.map((s) => {
            const difficulty =
              s.perceived_difficulty != null
                ? PERCEIVED_DIFFICULTY_LABELS[
                    s.perceived_difficulty as 1 | 2 | 3 | 4 | 5
                  ]
                : null;
            return (
              <View key={s.session_id} style={styles.sessionCard}>
                <View style={styles.sessionTextArea}>
                  <Text style={styles.sessionExerciseName}>
                    {exerciseNames[s.exercise] ?? '운동'}
                  </Text>
                  <Text style={styles.sessionDate}>{formatSessionDate(s.created_at)}</Text>
                </View>
                <View
                  style={[
                    styles.difficultyPill,
                    difficulty == null && styles.difficultyPillMuted,
                  ]}
                >
                  {difficulty ? (
                    <>
                      <Text style={styles.difficultyPillEmoji}>{difficulty.emoji}</Text>
                      <Text style={styles.difficultyPillText}>{difficulty.label}</Text>
                    </>
                  ) : (
                    <Text style={styles.difficultyPillMutedText}>평가 안 함</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 28,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  stateBox: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stateText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    lineHeight: 28,
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  retryButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  emptyBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  sessionTextArea: {
    flex: 1,
  },
  sessionExerciseName: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  sessionDate: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  difficultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoftBackground,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  difficultyPillMuted: {
    backgroundColor: colors.grayBadgeBackground,
    borderColor: colors.borderLight,
  },
  difficultyPillEmoji: {
    fontSize: 18,
  },
  difficultyPillText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  difficultyPillMutedText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.disabledText,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
});
