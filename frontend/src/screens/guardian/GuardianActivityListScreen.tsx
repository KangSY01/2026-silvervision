import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Activity, ArrowRight, Bell, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ActivityLogResponse,
  apiClient,
  EmergencyEventResponse,
  ExerciseSessionResponse,
  getSession,
  GuardianSeniorMapResponse,
} from '../../api/client';
import GuardianTabScreenLayout from '../../components/GuardianTabScreenLayout';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import { hasActiveFallAlert, isNotifiedAlert } from './emergency';

type LoadState = 'loading' | 'ready' | 'error';

// 카드 색상/문구를 결정하는 종합 안전 상태. 세 신호(응급 낙상 / 오늘 접속 /
// 오늘 운동 완료)를 우선순위대로 접어 하나로 만든다.
type SeniorSafetyStatus =
  | 'fall_suspected' // 낙상 의심 이벤트가 대응 진행 중
  | 'not_connected_today' // 오늘 0시 이후 활동 로그·운동 기록이 전혀 없음
  | 'workout_done_today' // 오늘 완료한 운동 세션이 1건 이상
  | 'connected_today'; // 오늘 접속은 확인됐으나 아직 운동 전(기본 정상)

interface SeniorRow {
  seniorId: number;
  name: string;
  avatarInitials: string;
  weeklyWorkoutCount: number;
  status: SeniorSafetyStatus;
}

const STATUS_TEXT: Record<SeniorSafetyStatus, string> = {
  fall_suspected: '🚨 낙상 의심 감지',
  not_connected_today: '오늘 미접속 ⚠️',
  workout_done_today: '오늘 운동 완료 ✓',
  connected_today: '오늘 접속 확인됨',
};

// 이번 주 시작(월요일 0시, 기기 로컬 시각). "이번 주 총 N회"는 월~오늘 기준.
function startOfThisWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay(): 0=일 … 6=토
  d.setDate(d.getDate() - daysSinceMonday);
  return d.getTime();
}

// 오늘 0시(기기 로컬 시각).
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isCompletedSession(session: ExerciseSessionResponse): boolean {
  // 백엔드는 완료 PATCH 시에만 completion_rate를 채운다(운동 중 X로 이탈하면
  // null로 남고 집계에서 빠진다 — AGENTS.md의 세션 연동 흐름과 동일 기준).
  return session.completion_rate !== null;
}

function toRow(
  mapping: GuardianSeniorMapResponse,
  sessions: ExerciseSessionResponse[],
  activityLogs: ActivityLogResponse[],
  events: EmergencyEventResponse[],
): SeniorRow {
  const seniorId = mapping.senior.senior_id;
  const weekStart = startOfThisWeek();
  const todayStart = startOfToday();

  const weeklyWorkoutCount = sessions.filter(
    (s) => isCompletedSession(s) && new Date(s.created_at).getTime() >= weekStart,
  ).length;

  const workoutDoneToday = sessions.some(
    (s) => isCompletedSession(s) && new Date(s.created_at).getTime() >= todayStart,
  );

  // 오늘 완료한 운동이 있으면 그 자체가 "오늘 접속" 증거다(기기 활동 로깅이
  // 아직 안 붙은 환경에서 activity-log만 비어 있는 경우 대비).
  const connectedToday = activityLogs.length > 0 || workoutDoneToday;

  // 우선순위: 낙상 의심 > 오늘 미접속 > 오늘 운동 완료 > 기본(접속 확인).
  // 낙상은 유일한 생명·안전 신호라 "오늘 운동 안 함" 같은 하위 신호에 가려지면
  // 안 되고, "미접속"은 무활동 감지 서비스의 핵심 우려라 운동 완료 여부보다
  // 앞선다("오늘 상태를 확인할 수 없음" > "오늘 운동을 안 함").
  let status: SeniorSafetyStatus = 'connected_today';
  if (hasActiveFallAlert(events, seniorId)) {
    status = 'fall_suspected';
  } else if (!connectedToday) {
    status = 'not_connected_today';
  } else if (workoutDoneToday) {
    status = 'workout_done_today';
  }

  return {
    seniorId,
    name: mapping.senior.name,
    avatarInitials: mapping.senior.name.slice(-2),
    weeklyWorkoutCount,
    status,
  };
}

export default function GuardianActivityListScreen() {
  const navigation = useNavigation();

  const [rows, setRows] = useState<SeniorRow[]>([]);
  const [hasCriticalAlert, setHasCriticalAlert] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  // 화면 진입/복귀마다 다시 불러온다(AddSenior에서 등록하고 돌아오거나 시간이
  // 지나 "오늘"이 바뀌면 반영돼야 하므로 — GuardianHomeScreen과 동일한 패턴).
  // 최초 로드만 'loading'을 노출하고 이후 포커스 재조회는 기존 목록을 둔 채
  // 조용히 갱신한다.
  const loadDashboard = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }

      // 1) 매핑된 피보호자 목록 + 응급 이벤트는 서로 독립이라 병렬로.
      //    GET /emergency/ 는 이미 보호자 매핑 기준으로 필터링돼서 온다.
      const [mappings, events] = await Promise.all([
        apiClient.get<GuardianSeniorMapResponse[]>(`/guardian/${session.userId}/seniors/`),
        apiClient.get<EmergencyEventResponse[]>('/emergency/'),
      ]);

      // 2) 피보호자별 세션 목록 + 오늘 활동 로그. 인원이 보통 2~5명으로 적어
      //    N번 호출을 병렬(Promise.all)로 던져도 부담이 없고, 순차로 하면
      //    지연이 인원수만큼 곱해진다. 화면 진입마다 새로 부르므로 별도
      //    캐싱은 두지 않는다(등록 변화·날짜 경계 반영이 우선).
      const todayIso = new Date(startOfToday()).toISOString();
      const perSenior = await Promise.all(
        mappings.map((mapping) =>
          Promise.all([
            apiClient.get<ExerciseSessionResponse[]>(
              `/senior/${mapping.senior.senior_id}/sessions/`,
            ),
            apiClient.get<ActivityLogResponse[]>(
              `/senior/${mapping.senior.senior_id}/activity-log/?since=${encodeURIComponent(
                todayIso,
              )}`,
            ),
          ]),
        ),
      );

      setRows(
        mappings.map((mapping, index) =>
          toRow(mapping, perSenior[index][0], perSenior[index][1], events),
        ),
      );
      setHasCriticalAlert(events.some((event) => isNotifiedAlert(event.status)));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const handleOpenAlerts = () => {
    navigation.navigate('AlertHistory');
  };

  const handleAddSenior = () => {
    navigation.navigate('AddSenior');
  };

  const handleSelectSenior = (seniorId: number) => {
    // SeniorDetail route param은 문자열 계약(RootStackParamList) - 상세 화면이
    // Number()로 되돌려 API 조회에 쓴다.
    navigation.navigate('SeniorDetail', { seniorId: String(seniorId) });
  };

  return (
    <GuardianTabScreenLayout activeTab="activity">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Greeting Box */}
        <View style={styles.welcomeBox}>
          <View>
            <Text style={styles.overline}>실버비전 원격 관제</Text>
            <Text style={styles.welcomeHeading}>활동 및 안전 분석 기록</Text>
          </View>
          <Pressable
            onPress={handleOpenAlerts}
            style={({ pressed }) => [styles.bellButton, pressed && styles.pressedOpacity]}
          >
            <Bell size={20} color={colors.textSecondary} />
            {hasCriticalAlert && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {/* Add Senior Action Button at the TOP */}
        <Pressable
          onPress={handleAddSenior}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.addButtonText}>피보호자 추가 등록하기</Text>
        </Pressable>

        {/* Registered Seniors List */}
        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeading}>모니터링 피보호자 ({rows.length}명)</Text>
            <Text style={styles.listHeaderRight}>실시간 분석 중</Text>
          </View>

          {loadState === 'loading' ? (
            <Text style={styles.stateText}>피보호자 활동 정보를 불러오는 중...</Text>
          ) : loadState === 'error' ? (
            <Text style={styles.stateText}>
              활동 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </Text>
          ) : rows.length === 0 ? (
            <Text style={styles.stateText}>
              아직 등록된 피보호자가 없습니다. 위 &apos;피보호자 추가 등록하기&apos;로 등록해 주세요.
            </Text>
          ) : (
            <View style={styles.cardList}>
              {rows.map((row) => {
                let statusStyle = styles.statusChipOk;
                let statusTextStyle = styles.statusChipTextOk;
                let cardStyle = styles.card;

                if (row.status === 'not_connected_today') {
                  statusStyle = styles.statusChipWarn;
                  statusTextStyle = styles.statusChipTextWarn;
                  cardStyle = styles.cardWarn;
                } else if (row.status === 'fall_suspected') {
                  statusStyle = styles.statusChipDanger;
                  statusTextStyle = styles.statusChipTextDanger;
                  cardStyle = styles.cardDanger;
                }

                return (
                  <Pressable
                    key={row.seniorId}
                    onPress={() => handleSelectSenior(row.seniorId)}
                    style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.cardTopLeft}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{row.avatarInitials}</Text>
                        </View>
                        <View>
                          <View style={styles.cardNameRow}>
                            <Text style={styles.cardName}>{row.name} 어르신</Text>
                            <Text style={styles.cardId}>(ID: {row.seniorId})</Text>
                          </View>
                          <View style={styles.cardSubRow}>
                            <Activity size={14} color={colors.primary} />
                            <Text style={styles.cardSubtext}>
                              이번 주 총 {row.weeklyWorkoutCount}회 운동 수행
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ArrowRight size={16} color={colors.border} />
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={styles.cardFooterLabel}>오늘의 안전 요약</Text>
                      <View style={statusStyle}>
                        <Text style={statusTextStyle}>{STATUS_TEXT[row.status]}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Information Notice */}
        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>
            실버비전 스마트 관절 분석 카메라는 어르신의 거실이나 스마트 기기 운동 시 실시간으로
            비접촉식 낙상 감지 센서를 운용합니다.
          </Text>
        </View>
      </ScrollView>
    </GuardianTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  welcomeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  overline: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  welcomeHeading: {
    fontSize: guardianFontSizes.heading,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  bellButton: {
    width: GUARDIAN_MIN_TOUCH_TARGET,
    height: GUARDIAN_MIN_TOUCH_TARGET,
    borderRadius: GUARDIAN_MIN_TOUCH_TARGET / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
  },
  addButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primaryTintBorder,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  addButtonPressed: {
    borderColor: colors.primary,
  },
  addButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  listSection: {
    gap: spacing.sm + spacing.xs,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  listHeading: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  listHeaderRight: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  stateText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
  cardList: {
    gap: spacing.sm + spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.sm + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardWarn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.amberCardBorder,
    gap: spacing.sm + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardDanger: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.dangerBorderStrong,
    gap: spacing.sm + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: {
    borderColor: colors.primary,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTintBackground,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardName: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  cardId: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  cardSubtext: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: spacing.sm,
  },
  cardFooterLabel: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  statusChipOk: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusChipWarn: {
    backgroundColor: colors.amberBackground,
    borderWidth: 1,
    borderColor: colors.amberCardBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusChipDanger: {
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusChipTextOk: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  statusChipTextWarn: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.amberTextDeep,
  },
  statusChipTextDanger: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.danger,
  },
  footnote: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    padding: spacing.sm + spacing.xs,
  },
  footnoteText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
