import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
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

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n: number) => String(n).padStart(2, '0');

// Date(기기 로컬 시각) → 'YYYY-MM-DD'. 달력 그룹화·선택 상태 키로 쓴다.
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// created_at(ISO, UTC) → "오전/오후 h:mm"(기기 로컬 시각). 날짜는 선택일 섹션
// 제목에 이미 표시되므로 목록 항목에는 시각만 보여준다(SeniorDetailScreen의
// formatTimeKo와 동일 포맷).
function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const h = date.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? '오전' : '오후'} ${h12}:${pad(date.getMinutes())}`;
}

interface CalendarDayCell {
  day: number;
  dateKey: string;
}

export default function AbilityHistoryScreen() {
  const navigation = useNavigation();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [sessions, setSessions] = useState<ExerciseSessionResponse[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<number, string>>({});

  const todayKey = useMemo(() => localDateKey(new Date()), []);
  // 달력에 표시 중인 "월"(1일 기준). 기본값은 이번 달 - 오늘이 기본으로 열려
  // 있어야 한다는 요구사항.
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

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

  // 날짜(기기 로컬 'YYYY-MM-DD')별로 그룹화. created_at은 서버가 UTC로 주는
  // ISO 문자열이라 new Date()로 파싱한 뒤 로컬 getter로 키를 뽑아야 자정 근처
  // 세션이 엉뚱한 날짜 칸에 찍히지 않는다. completedSessions가 이미 최신순
  // 정렬돼 있어 그룹 내부도 별도 정렬 없이 최신순이 유지된다.
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ExerciseSessionResponse[]> = {};
    for (const s of completedSessions) {
      const key = localDateKey(new Date(s.created_at));
      (map[key] ??= []).push(s);
    }
    return map;
  }, [completedSessions]);

  // 달력 그리드: 1일 앞 여백(일요일 시작) + 실제 날짜 + 마지막 주를 7의 배수로
  // 채우는 뒤 여백. new Date(year, month+1, 0)은 그 달의 마지막 날을 주는
  // 안전한 트릭이라 월별 일수·연도 경계(12월→1월)를 따로 분기할 필요가 없다.
  const calendarCells = useMemo<(CalendarDayCell | null)[]>(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (CalendarDayCell | null)[] = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, dateKey: `${year}-${pad(month + 1)}-${pad(day)}` });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  const monthLabel = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;

  const selectedDateLabel = useMemo(() => {
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${m}월 ${d}일 (${WEEKDAY_LABELS[date.getDay()]}) 운동 기록`;
  }, [selectedDateKey]);

  const selectedDateSessions = sessionsByDate[selectedDateKey] ?? [];

  const goPrevMonth = () =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goNextMonth = () =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handleBack = () => navigation.goBack();

  function renderSessionCard(s: ExerciseSessionResponse) {
    const difficulty =
      s.perceived_difficulty != null
        ? PERCEIVED_DIFFICULTY_LABELS[s.perceived_difficulty as 1 | 2 | 3 | 4 | 5]
        : null;
    return (
      <View key={s.session_id} style={styles.sessionCard}>
        <View style={styles.sessionTextArea}>
          <Text style={styles.sessionExerciseName}>{exerciseNames[s.exercise] ?? '운동'}</Text>
          <Text style={styles.sessionDate}>{formatSessionTime(s.created_at)}</Text>
        </View>
        <View style={[styles.difficultyPill, difficulty == null && styles.difficultyPillMuted]}>
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
  }

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
          달력에서 날짜를 선택하면 그날 하신 운동과 체감 난이도를 확인할 수 있어요.
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
        ) : (
          <>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Pressable
                  onPress={goPrevMonth}
                  style={({ pressed }) => [styles.monthNavButton, pressed && styles.pressedOpacity]}
                >
                  <ChevronLeft size={26} color={colors.text} strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
                <Pressable
                  onPress={goNextMonth}
                  style={({ pressed }) => [styles.monthNavButton, pressed && styles.pressedOpacity]}
                >
                  <ChevronRight size={26} color={colors.text} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={label} style={styles.weekdayLabel}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarCells.map((cell, idx) =>
                  cell == null ? (
                    <View key={`blank-${idx}`} style={styles.dayCell} />
                  ) : (
                    <Pressable
                      key={cell.dateKey}
                      onPress={() => setSelectedDateKey(cell.dateKey)}
                      style={({ pressed }) => [
                        styles.dayCell,
                        cell.dateKey === selectedDateKey && styles.dayCellSelected,
                        pressed && styles.pressedOpacity,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          cell.dateKey === todayKey && styles.dayCellTextToday,
                          cell.dateKey === selectedDateKey && styles.dayCellTextSelected,
                        ]}
                      >
                        {cell.day}
                      </Text>
                      {sessionsByDate[cell.dateKey] ? <View style={styles.dayDot} /> : null}
                    </Pressable>
                  ),
                )}
              </View>
            </View>

            <View style={styles.selectedDaySection}>
              <Text style={styles.selectedDayTitle}>{selectedDateLabel}</Text>
              {selectedDateSessions.length === 0 ? (
                <Text style={styles.noSessionText}>이 날은 운동 기록이 없어요</Text>
              ) : (
                selectedDateSessions.map((s) => renderSessionCard(s))
              )}
            </View>
          </>
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
  calendarCard: {
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
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  calendarMonthLabel: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.primaryTintBackground,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCellText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  dayCellTextToday: {
    color: colors.primary,
    fontWeight: fontWeights.black,
  },
  dayCellTextSelected: {
    color: colors.primary,
    fontWeight: fontWeights.black,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  selectedDaySection: {
    gap: spacing.sm,
  },
  selectedDayTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  noSessionText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    lineHeight: 28,
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
