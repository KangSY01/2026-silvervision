import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Activity, TrendingUp } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  apiClient,
  getSession,
  PhysicalAbilityLogResponse,
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
type Metric = 'rom' | 'completion';

// 추이를 보여줄 창(2주). 중간보고서의 "주/월 단위 변화 그래프" 취지를 살리되
// 범위 토글까지 두는 건 과설계라 판단해 고정 2주 창으로 둔다. 하루 최대 1건이라
// 최대 14개 점이고, 좁은 화면 폭에 맞춰 날짜 라벨은 점이 있는 날에만 그린다.
const WINDOW_DAYS = 14;

const CHART_WIDTH = 320;
const CHART_HEIGHT = 150;
const CHART_TOP = 14;
const CHART_BASELINE = 120; // y=CHART_BASELINE 이 0점, y=CHART_TOP 이 100점
const PLOT_HEIGHT = CHART_BASELINE - CHART_TOP;

// rom_score/completion_score의 척도는 백엔드에서 아직 확정 전이다
// (PhysicalAbilityLogSerializer 주석: "점수 상한은 척도가 아직 확정 전이라
// 두지 않는다"). 중간보고서는 두 값을 "완성도/가동범위" 점수로 서술하므로
// 0~100 스케일로 그리고, 벗어난 값은 축 안으로 clamp해 표시한다(실제 수치는
// 라벨로 그대로 노출).
const SCORE_MAX = 100;

const METRIC_META: Record<
  Metric,
  { label: string; short: string; unit: string; description: string }
> = {
  rom: {
    label: '관절 가동범위',
    short: '가동범위',
    unit: '점',
    description: '관절을 움직일 수 있는 범위를 점수로 나타낸 값이에요.',
  },
  completion: {
    label: '동작 완성도',
    short: '완성도',
    unit: '점',
    description: '운동 동작을 기준 자세에 얼마나 가깝게 해내셨는지 나타낸 값이에요.',
  },
};

interface DayBucket {
  key: string; // 'YYYY-MM-DD' (기기 로컬 기준)
  label: string; // 'M/D'
}

// 오늘부터 WINDOW_DAYS-1 일 전까지, 오래된 → 최신 순의 일 단위 버킷.
function recentDayBuckets(): DayBucket[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const buckets: DayBucket[] = [];
  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date(base);
    day.setDate(day.getDate() - offset);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
      day.getDate(),
    ).padStart(2, '0')}`;
    buckets.push({ key, label: `${day.getMonth() + 1}/${day.getDate()}` });
  }
  return buckets;
}

function xForIndex(index: number, count: number) {
  const paddingX = 24;
  const usable = CHART_WIDTH - paddingX * 2;
  if (count <= 1) return CHART_WIDTH / 2;
  return paddingX + (usable / (count - 1)) * index;
}

function yForScore(score: number) {
  const clamped = Math.max(0, Math.min(SCORE_MAX, score));
  return CHART_BASELINE - (clamped / SCORE_MAX) * PLOT_HEIGHT;
}

interface Point {
  x: number;
  score: number;
  label: string;
}

export default function AbilityHistoryScreen() {
  const navigation = useNavigation();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [logs, setLogs] = useState<PhysicalAbilityLogResponse[]>([]);
  const [metric, setMetric] = useState<Metric>('completion');

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
      const res = await apiClient.get<PhysicalAbilityLogResponse[]>(
        `/senior/${session.userId}/ability-log/`,
      );
      setLogs(res);
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

  const buckets = useMemo(() => recentDayBuckets(), []);

  // 날짜(logged_date) → 그 날 기록. 하루 1건이라 그대로 맵으로 만든다.
  const byDate = useMemo(() => {
    const map = new Map<string, PhysicalAbilityLogResponse>();
    for (const log of logs) map.set(log.logged_date, log);
    return map;
  }, [logs]);

  // 현재 지표에 대해, 최근 2주 창에서 값이 있는 날만 점으로. 값 없는 날은
  // 점을 생략한다(SeniorDetailScreen의 데이터 없는 날 처리와 같은 원칙).
  const points = useMemo<Point[]>(() => {
    const field = metric === 'rom' ? 'rom_score' : 'completion_score';
    const result: Point[] = [];
    buckets.forEach((bucket, index) => {
      const log = byDate.get(bucket.key);
      if (!log) return;
      const value = Number(log[field]);
      if (Number.isNaN(value)) return;
      result.push({
        x: xForIndex(index, buckets.length),
        score: value,
        label: bucket.label,
      });
    });
    return result;
  }, [buckets, byDate, metric]);

  const pathD = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${yForScore(p.score)}`)
    .join(' ');

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const first = points.length > 0 ? points[0] : null;
  const delta =
    latest && first && points.length > 1
      ? Math.round((latest.score - first.score) * 10) / 10
      : null;

  const meta = METRIC_META[metric];

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

        <Text style={styles.title}>건강 변화 추적</Text>
        <Text style={styles.subtitle}>
          운동하실 때마다 관절 가동범위와 동작 완성도를 기록해 2주간 변화를 보여드려요.
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
            {/* 지표 전환 토글 */}
            <View style={styles.metricRow}>
              {(['completion', 'rom'] as Metric[]).map((key) => {
                const active = metric === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setMetric(key)}
                    style={({ pressed }) => [
                      styles.metricButton,
                      active && styles.metricButtonActive,
                      pressed && !active && styles.metricButtonPressed,
                    ]}
                  >
                    <Text
                      style={[styles.metricButtonText, active && styles.metricButtonTextActive]}
                    >
                      {METRIC_META[key].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Activity size={20} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.cardTitle}>{meta.label} 변화</Text>
              </View>
              <Text style={styles.cardDescription}>{meta.description}</Text>

              {points.length === 0 ? (
                <View style={styles.emptyChartBox}>
                  <Text style={styles.emptyChartTitle}>아직 기록이 없어요</Text>
                  <Text style={styles.emptyChartText}>
                    운동 자세 분석(카메라) 기능이 연결되면 운동하실 때마다 이 그래프에
                    변화가 쌓입니다.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>최근 기록</Text>
                      <Text style={styles.summaryValue}>
                        {latest ? Math.round(latest.score * 10) / 10 : '-'}
                        <Text style={styles.summaryUnit}> {meta.unit}</Text>
                      </Text>
                    </View>
                    {delta !== null ? (
                      <View style={styles.summaryItem}>
                        <View style={styles.summaryDeltaRow}>
                          <TrendingUp
                            size={16}
                            color={delta >= 0 ? colors.primary : colors.danger}
                            strokeWidth={2.5}
                          />
                          <Text
                            style={[
                              styles.summaryDelta,
                              { color: delta >= 0 ? colors.primary : colors.danger },
                            ]}
                          >
                            {delta >= 0 ? '+' : ''}
                            {delta} {meta.unit}
                          </Text>
                        </View>
                        <Text style={styles.summaryLabel}>2주 전 첫 기록 대비</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.chartBox}>
                    <Svg
                      width="100%"
                      height={CHART_HEIGHT}
                      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    >
                      {/* 25/50/75/100점 보조선 */}
                      {[0, 25, 50, 75, 100].map((score) => (
                        <Line
                          key={score}
                          x1={0}
                          y1={yForScore(score)}
                          x2={CHART_WIDTH}
                          y2={yForScore(score)}
                          stroke={colors.borderLight}
                          strokeWidth={1}
                          strokeDasharray={score === 0 ? undefined : '4,4'}
                        />
                      ))}

                      {points.length > 1 ? (
                        <Path
                          d={pathD}
                          fill="none"
                          stroke={colors.primary}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}

                      {points.map((p) => (
                        <Circle
                          key={`${p.label}-${p.score}`}
                          cx={p.x}
                          cy={yForScore(p.score)}
                          r={5}
                          fill={colors.primary}
                        />
                      ))}
                      {points.map((p) => (
                        <SvgText
                          key={`v-${p.label}-${p.score}`}
                          x={p.x}
                          y={yForScore(p.score) - 12}
                          fontSize={11}
                          fontWeight="bold"
                          fill={colors.primary}
                          textAnchor="middle"
                        >
                          {Math.round(p.score)}
                        </SvgText>
                      ))}
                      {points.map((p) => (
                        <SvgText
                          key={`d-${p.label}-${p.score}`}
                          x={p.x}
                          y={CHART_HEIGHT - 6}
                          fontSize={11}
                          fontWeight="bold"
                          fill={colors.textSecondary}
                          textAnchor="middle"
                        >
                          {p.label}
                        </SvgText>
                      ))}
                    </Svg>
                  </View>

                  {points.length === 1 ? (
                    <Text style={styles.singlePointHint}>
                      아직 기록이 하루치뿐이에요. 며칠 더 운동하시면 변화 그래프가 그려집니다.
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            <Text style={styles.footnote}>
              관절 가동범위·동작 완성도 점수는 운동 중 카메라 자세 분석으로 측정됩니다.
              분석 기능이 연결되기 전까지는 기록이 쌓이지 않습니다.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// TODO(vision): 이 화면은 현재 조회 전용이다. rom_score/completion_score는
// 온디바이스 자세 추정(BlazePose) 결과여야 하는데 비전 파이프라인이 아직
// 붙지 않았고, 유일한 후보 소스인 ExerciseSession.accuracy_avg 조차
// ExerciseFeedbackScreen에서 고정 placeholder(SCORE = 87)라 그 평균을
// completion_score로 써 봐야 매일 같은 상수가 찍힌다 - 지난 배치들의
// "없는 데이터를 지어내지 않는다" 원칙에 어긋난다. completion_rate(타이머
// 경과율)는 실제 값이지만 "동작 완성도"와 의미가 달라(운동을 얼마나 오래
// 했나 ≠ 자세를 얼마나 정확히 완성했나) 이 추세선에 섞으면 오히려 오해를
// 준다. 따라서 POST /senior/{id}/ability-log/ 호출은 비전 연동 시점으로
// 미룬다. 연동 시 훅 지점: ExerciseFeedbackScreen의 세션 완료 useEffect에서
// 세션 완료 PATCH 직후, 그 날 완료 세션들의 실제 rom/accuracy 값으로
// upsert POST를 이어붙인다(fruit_count/ranking 자동 갱신과 같은 패턴).

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
    gap: spacing.lg,
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
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  metricButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  metricButtonPressed: {
    borderColor: colors.primary,
  },
  metricButtonText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  metricButtonTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.md + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  cardDescription: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 26,
  },
  emptyChartBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyChartTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  emptyChartText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  summaryItem: {
    gap: spacing.xs,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.disabledText,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  summaryUnit: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  summaryDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryDelta: {
    fontSize: 22,
    fontWeight: fontWeights.black,
  },
  chartBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  singlePointHint: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 26,
  },
  footnote: {
    fontSize: 15,
    fontWeight: fontWeights.medium,
    color: colors.disabledText,
    lineHeight: 24,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
});
