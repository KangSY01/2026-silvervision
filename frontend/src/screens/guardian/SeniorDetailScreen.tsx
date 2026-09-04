import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  apiClient,
  EmergencyEventResponse,
  ExerciseResponse,
  ExerciseSessionResponse,
  getApiErrorMessage,
  getSession,
  SeniorProfileResponse,
} from '../../api/client';
import { MOBILITY_LEVEL_TO_ACTIVITY_LEVEL } from '../../labels';
import { RootStackParamList } from '../../navigation/types';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import {
  EMERGENCY_STATUS_LABELS,
  EMERGENCY_TYPE_LABELS,
  formatEmergencyTimestamp,
  isAlertClosed,
} from './emergency';

type LoadState = 'loading' | 'ready' | 'error';

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;
const CHART_BASELINE = 118;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const ACCURACY_TARGET = 80; // 동작 완성도 목표선(%) - 피보호자 데이터가 아닌 고정 기준선

function xForIndex(index: number, count: number) {
  const paddingX = 22;
  const usable = CHART_WIDTH - paddingX * 2;
  return paddingX + (usable / (count - 1)) * index;
}

interface DayBucket {
  label: string;
  start: number;
  end: number;
}

// 오늘 0시부터 6일 전 0시까지, 총 7개 일 단위 버킷(오래된 → 최신, 기기 로컬 시각).
function last7DayBuckets(): DayBucket[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const buckets: DayBucket[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(base);
    day.setDate(day.getDate() - offset);
    const start = day.getTime();
    buckets.push({ label: WEEKDAY_LABELS[day.getDay()], start, end: start + 86_400_000 });
  }
  return buckets;
}

function isCompleted(session: ExerciseSessionResponse): boolean {
  // 백엔드는 완료 PATCH 시에만 completion_rate를 채운다(운동 중 이탈은 null).
  return session.completion_rate !== null;
}

function formatTimeKo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? '오전' : '오후'} ${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SeniorDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'SeniorDetail'>>();
  const seniorId = Number(route.params.seniorId);

  const [activeTab, setActiveTab] = useState<'activity' | 'accuracy'>('activity');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [profile, setProfile] = useState<SeniorProfileResponse | null>(null);
  const [sessions, setSessions] = useState<ExerciseSessionResponse[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<number, string>>({});
  const [events, setEvents] = useState<EmergencyEventResponse[]>([]);

  // 화면 진입/복귀마다 재조회(flat 스택이라 언마운트되지 않음 - 다른 가디언
  // 화면과 동일 패턴). 최초만 'loading'을 노출하고 이후 포커스 재조회는
  // 기존 화면을 둔 채 조용히 갱신한다.
  const load = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const [profileRes, sessionRes, exerciseRes, eventRes] = await Promise.all([
        apiClient.get<SeniorProfileResponse>(`/senior/${seniorId}/`),
        apiClient.get<ExerciseSessionResponse[]>(`/senior/${seniorId}/sessions/`),
        apiClient.get<ExerciseResponse[]>('/exercises/'),
        apiClient.get<EmergencyEventResponse[]>('/emergency/'),
      ]);
      setProfile(profileRes);
      setSessions(sessionRes);
      // 세션 목록에는 운동 이름이 nested 안 되어 있어(exercise PK만) 별도 매핑.
      setExerciseNames(
        Object.fromEntries(exerciseRes.map((ex) => [ex.exercise_id, ex.name])),
      );
      // GET /emergency/ 는 이미 보호자 매핑 기준으로 필터링돼 오지만, 이 화면은
      // 특정 한 피보호자만 다루므로 senior_id 로 한 번 더 좁힌다.
      setEvents(eventRes.filter((event) => event.senior === seniorId));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [seniorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const buckets = useMemo(() => last7DayBuckets(), []);

  // 최근 7일 "완료한 운동 세션 수"(백엔드에 세션 소요시간 필드가 없어 원본
  // "운동 시간(분)" 대신 실제로 있는 값인 완료 횟수를 쓴다).
  const weeklyCounts = useMemo(
    () =>
      buckets.map(
        (b) =>
          sessions.filter((s) => {
            const t = Date.parse(s.created_at);
            return isCompleted(s) && t >= b.start && t < b.end;
          }).length,
      ),
    [buckets, sessions],
  );

  // 최근 7일 날짜별 accuracy_avg 평균(값이 있는 세션만; 없으면 null=데이터 없음).
  const weeklyAccuracy = useMemo(
    () =>
      buckets.map((b) => {
        const values = sessions
          .filter((s) => {
            const t = Date.parse(s.created_at);
            return s.accuracy_avg !== null && t >= b.start && t < b.end;
          })
          .map((s) => Number(s.accuracy_avg));
        if (values.length === 0) return null;
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      }),
    [buckets, sessions],
  );

  const weeklyTotalCount = weeklyCounts.reduce((sum, c) => sum + c, 0);
  const maxCount = Math.max(1, ...weeklyCounts);

  const accuracyPoints = weeklyAccuracy
    .map((score, index) =>
      score === null ? null : { x: xForIndex(index, buckets.length), score },
    )
    .filter((p): p is { x: number; score: number } => p !== null);
  const weeklyAccuracyAvg =
    accuracyPoints.length > 0
      ? Math.round(
          accuracyPoints.reduce((sum, p) => sum + p.score, 0) / accuracyPoints.length,
        )
      : null;
  const accuracyPathD = accuracyPoints
    .map(
      (p, index) =>
        `${index === 0 ? 'M' : 'L'} ${p.x} ${CHART_BASELINE - (p.score / 100) * 100}`,
    )
    .join(' ');
  const targetAccuracyY = CHART_BASELINE - (ACCURACY_TARGET / 100) * 100;

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todayWorkouts = useMemo(
    () =>
      sessions
        .filter((s) => isCompleted(s) && Date.parse(s.created_at) >= todayStart)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [sessions, todayStart],
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const doUnlink = async () => {
    try {
      const session = await getSession();
      if (!session) {
        Alert.alert('세션 만료', '다시 로그인해 주세요.');
        return;
      }
      await apiClient.delete<void>(`/guardian/${session.userId}/seniors/${seniorId}/`);
      navigation.navigate('GuardianHome');
    } catch (err) {
      Alert.alert('연동 해제 실패', getApiErrorMessage(err, '잠시 후 다시 시도해 주세요.'));
    }
  };

  const handleUnlink = () => {
    Alert.alert(
      '기기 연동 해제',
      `${profile?.name ?? '해당'} 어르신과의 연동을 해제하시겠습니까?\n` +
        '해제하면 이 어르신의 활동·안전 정보를 더 이상 볼 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '연동 해제', style: 'destructive', onPress: () => void doUnlink() },
      ],
    );
  };

  if (loadState === 'loading') {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerStateText}>피보호자 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (loadState === 'error' || !profile) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>피보호자 정보를 불러오지 못했습니다.</Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.notFoundButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.notFoundButtonText}>목록으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const avatarInitials = profile.name.slice(-2);
  const protectionLevel = MOBILITY_LEVEL_TO_ACTIVITY_LEVEL[profile.mobility_level];

  return (
    <View style={styles.container}>
      {/* Header with Senior Profile Summary & Unlink Action */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
          >
            <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
            <Text style={styles.backButtonText}>목록으로</Text>
          </Pressable>

          <Pressable
            onPress={handleUnlink}
            style={({ pressed }) => [styles.unlinkButton, pressed && styles.pressedOpacity]}
          >
            <Trash2 size={14} color={colors.disabledText} />
            <Text style={styles.unlinkButtonText}>기기 연동 해제</Text>
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name} 어르신</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>보호 등급: {protectionLevel}</Text>
              <Text style={styles.profileMetaDot}>•</Text>
              <Text style={styles.profileMetaMuted}>연동 ID: {profile.login_id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.healthBox}>
          <Text style={styles.healthText}>
            <Text style={styles.healthLabel}>주요 질환: </Text>
            {profile.diseases || '등록된 주요 질환 소견 없음'}
          </Text>
          <Text style={styles.healthText}>
            <Text style={styles.healthLabel}>복용 중인 약: </Text>
            {profile.medication || '등록된 복용약 없음'}
          </Text>
          <Text style={styles.healthText}>
            <Text style={styles.healthLabel}>안전 거주: </Text>
            {profile.address || '정보 없음'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Charts Section */}
        <View style={styles.card}>
          {/* Segmented Tab Controls */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setActiveTab('activity')}
              style={[styles.tabButton, activeTab === 'activity' && styles.tabButtonActive]}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'activity' && styles.tabButtonTextActive]}
              >
                주간 운동 횟수
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('accuracy')}
              style={[styles.tabButton, activeTab === 'accuracy' && styles.tabButtonActive]}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'accuracy' && styles.tabButtonTextActive]}
              >
                관절 동작 완성도 (%)
              </Text>
            </Pressable>
          </View>

          {activeTab === 'activity' ? (
            <View>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartHeaderLabel}>최근 7일간 완료한 운동</Text>
                <View style={styles.chartHeaderRight}>
                  <TrendingUp size={13} color={colors.primary} />
                  <Text style={styles.chartHeaderRightText}>주간 누적: {weeklyTotalCount}회</Text>
                </View>
              </View>

              {weeklyTotalCount === 0 ? (
                <View style={styles.emptyChartBox}>
                  <Text style={styles.emptyChartText}>
                    최근 7일간 완료한 운동 기록이 없습니다.
                  </Text>
                </View>
              ) : (
                <View style={styles.chartBox}>
                  <Svg
                    width="100%"
                    height={CHART_HEIGHT}
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  >
                    {[25, 50, 75].map((offset) => (
                      <Line
                        key={offset}
                        x1={0}
                        y1={CHART_BASELINE - offset}
                        x2={CHART_WIDTH}
                        y2={CHART_BASELINE - offset}
                        stroke={colors.borderLight}
                        strokeWidth={1}
                        strokeDasharray="4,4"
                      />
                    ))}
                    {weeklyCounts.map((count, index) => {
                      const barWidth = 20;
                      const centerX = xForIndex(index, weeklyCounts.length);
                      const barHeight = count === 0 ? 0 : Math.max(12, (count / maxCount) * 90);
                      const y = CHART_BASELINE - barHeight;
                      return (
                        <G key={buckets[index].start}>
                          {count > 0 ? (
                            <Rect
                              x={centerX - barWidth / 2}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx={4}
                              fill={count >= 2 ? colors.primary : 'rgba(46, 125, 50, 0.4)'}
                            />
                          ) : null}
                          <SvgText
                            x={centerX}
                            y={(count === 0 ? CHART_BASELINE : y) - 6}
                            fontSize={10}
                            fontWeight="bold"
                            fill={count === 0 ? colors.disabledText : colors.primary}
                            textAnchor="middle"
                          >
                            {count}회
                          </SvgText>
                          <SvgText
                            x={centerX}
                            y={CHART_HEIGHT - 6}
                            fontSize={11}
                            fontWeight="bold"
                            fill={colors.textSecondary}
                            textAnchor="middle"
                          >
                            {buckets[index].label}
                          </SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                </View>
              )}
            </View>
          ) : (
            <View>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartHeaderLabel}>동작 정확도 트렌드</Text>
                {weeklyAccuracyAvg !== null ? (
                  <Text style={styles.chartHeaderRightAmber}>주간 평균 {weeklyAccuracyAvg}%</Text>
                ) : null}
              </View>

              {accuracyPoints.length === 0 ? (
                <View style={styles.emptyChartBox}>
                  <Text style={styles.emptyChartText}>
                    최근 7일간 동작 완성도 데이터가 없습니다.
                  </Text>
                </View>
              ) : (
                <View style={styles.chartBox}>
                  <Svg
                    width="100%"
                    height={CHART_HEIGHT}
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  >
                    <Line
                      x1={0}
                      y1={targetAccuracyY}
                      x2={CHART_WIDTH}
                      y2={targetAccuracyY}
                      stroke={colors.amberFill}
                      strokeWidth={1.5}
                      strokeDasharray="3,3"
                    />
                    <SvgText
                      x={4}
                      y={targetAccuracyY - 6}
                      fontSize={9}
                      fontWeight="bold"
                      fill={colors.amberTextDeep}
                      textAnchor="start"
                    >
                      목표 완성도 {ACCURACY_TARGET}%
                    </SvgText>
                    {accuracyPoints.length > 1 ? (
                      <Path
                        d={accuracyPathD}
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    {weeklyAccuracy.map((score, index) => {
                      const label = buckets[index].label;
                      const x = xForIndex(index, buckets.length);
                      return (
                        <G key={buckets[index].start}>
                          {score !== null ? (
                            <>
                              <Circle
                                cx={x}
                                cy={CHART_BASELINE - (score / 100) * 100}
                                r={4}
                                fill={colors.primary}
                              />
                              <SvgText
                                x={x}
                                y={CHART_BASELINE - (score / 100) * 100 - 10}
                                fontSize={9}
                                fontWeight="bold"
                                fill={colors.primary}
                                textAnchor="middle"
                              >
                                {Math.round(score)}%
                              </SvgText>
                            </>
                          ) : null}
                          <SvgText
                            x={x}
                            y={CHART_HEIGHT - 6}
                            fontSize={11}
                            fontWeight="bold"
                            fill={colors.textSecondary}
                            textAnchor="middle"
                          >
                            {label}
                          </SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Today's Completed Exercises */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>오늘 수행 운동 내역</Text>
          </View>

          {todayWorkouts.length > 0 ? (
            <View style={styles.workoutList}>
              {todayWorkouts.map((workout) => (
                <View key={workout.session_id} style={styles.workoutItem}>
                  <View style={styles.workoutItemLeft}>
                    <CheckCircle size={18} color={colors.primary} />
                    <Text style={styles.workoutName}>
                      {exerciseNames[workout.exercise] ?? `운동 #${workout.exercise}`}
                    </Text>
                  </View>
                  <View style={styles.workoutTimeRow}>
                    <Clock size={13} color={colors.disabledText} />
                    <Text style={styles.workoutTime}>
                      {formatTimeKo(workout.created_at)} 완료
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWorkoutBox}>
              <Text style={styles.emptyWorkoutText}>
                오늘 아직 완료된 운동이 존재하지 않습니다.
              </Text>
            </View>
          )}
        </View>

        {/* Incident Log Timeline */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <AlertOctagon size={16} color={colors.danger} />
            <Text style={styles.sectionTitle}>거동 안전 및 이상 감지 기록</Text>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyWorkoutBox}>
              <Text style={styles.emptyWorkoutText}>감지된 이상 기록이 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {events.map((event) => {
                const closed = isAlertClosed(event.status);
                const falseAlarm = event.status === 'false_alarm';

                let badgeStyle = styles.logBadgeNeutral;
                let badgeTextStyle = styles.logBadgeTextNeutral;
                if (falseAlarm) {
                  badgeStyle = styles.logBadgeInfo;
                  badgeTextStyle = styles.logBadgeTextInfo;
                } else if (closed) {
                  badgeStyle = styles.logBadgeOk;
                  badgeTextStyle = styles.logBadgeTextOk;
                }

                return (
                  <View
                    key={event.event_id}
                    style={[styles.logItem, closed && styles.logItemClosed]}
                  >
                    <View style={styles.logTopRow}>
                      <View style={styles.logMessageRow}>
                        <View style={[styles.logDot, closed && styles.logDotClosed]} />
                        <Text style={[styles.logMessage, closed && styles.logMessageClosed]}>
                          {EMERGENCY_TYPE_LABELS[event.event_type]} 감지
                        </Text>
                      </View>
                      <View style={badgeStyle}>
                        <Text style={badgeTextStyle}>{EMERGENCY_STATUS_LABELS[event.status]}</Text>
                      </View>
                    </View>
                    <View style={styles.logBottomRow}>
                      <Text style={styles.logBottomText}>원격 AI 감지 모듈</Text>
                      <Text style={styles.logBottomText}>
                        {formatEmergencyTimestamp(event.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centerStateText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  notFoundButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundButtonText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  header: {
    padding: spacing.md + spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
  },
  unlinkButtonText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: guardianFontSizes.title - 2,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  profileMeta: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  profileMetaDot: {
    fontSize: guardianFontSizes.badge,
    color: colors.border,
  },
  profileMetaMuted: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  healthBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.grayBadgeBackground,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
    gap: spacing.xs,
  },
  healthText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  healthLabel: {
    color: colors.disabledText,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md + spacing.xs,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.md - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chartHeaderLabel: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  chartHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartHeaderRightText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  chartHeaderRightAmber: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.amberIcon,
  },
  chartBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  emptyChartBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textAlign: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm + spacing.xs,
  },
  sectionTitle: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  workoutList: {
    gap: spacing.sm,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.grayBadgeBackground,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
  },
  workoutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  workoutName: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.extrabold,
    color: colors.textMuted,
    flexShrink: 1,
  },
  workoutTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  workoutTime: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  emptyWorkoutBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  emptyWorkoutText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textAlign: 'center',
  },
  logList: {
    gap: spacing.sm + spacing.xs,
  },
  logItem: {
    backgroundColor: 'rgba(254, 242, 242, 0.4)',
    borderWidth: 1,
    borderColor: colors.dangerBackground,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
    gap: spacing.xs,
  },
  logItemClosed: {
    backgroundColor: colors.background,
    borderColor: colors.grayBadgeBackground,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  logDotClosed: {
    backgroundColor: colors.disabledText,
  },
  logMessage: {
    flex: 1,
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.extrabold,
    color: colors.danger,
  },
  logMessageClosed: {
    color: colors.textMuted,
  },
  logBadgeNeutral: {
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  logBadgeTextNeutral: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.danger,
  },
  logBadgeInfo: {
    backgroundColor: colors.guardianInfoBackground,
    borderWidth: 1,
    borderColor: colors.guardianInfoBorder,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  logBadgeTextInfo: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.guardianInfoText,
  },
  logBadgeOk: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  logBadgeTextOk: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  logBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  logBottomText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
});
