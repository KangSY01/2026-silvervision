import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Plus,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  apiClient,
  EmergencyEventResponse,
  getSession,
  GuardianSeniorMapResponse,
} from '../../api/client';
import GuardianTabScreenLayout from '../../components/GuardianTabScreenLayout';
import { useAppState } from '../../context/AppStateContext';
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
  isNotifiedAlert,
} from './emergency';

type ListLoadState = 'loading' | 'ready' | 'error';

export default function GuardianHomeScreen() {
  const navigation = useNavigation();
  const { guardianProfile } = useAppState();

  const [mappings, setMappings] = useState<GuardianSeniorMapResponse[]>([]);
  const [events, setEvents] = useState<EmergencyEventResponse[]>([]);
  const [loadState, setLoadState] = useState<ListLoadState>('loading');

  // 화면 진입/복귀마다 매핑 목록을 다시 불러온다(SeniorHomeScreen의 useFocusEffect
  // 패턴 재사용). AddSeniorScreen에서 등록을 마치고 이 화면으로 돌아오면 바로
  // 반영되어야 하는데, flat 스택이라 화면이 언마운트되지 않아 useEffect([])로는
  // 재조회가 안 된다. 최초 로드만 'loading'을 노출하고 이후 포커스 재조회는
  // 기존 목록을 둔 채 조용히 갱신한다.
  const loadDashboard = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      // 매핑과 응급 이벤트를 함께 받는다(AlertHistoryScreen과 같은 조합).
      // /emergency/ 는 보호자에게 연결된 피보호자의 이벤트만 내려준다.
      const [mapResponse, eventResponse] = await Promise.all([
        apiClient.get<GuardianSeniorMapResponse[]>(
          `/guardian/${session.userId}/seniors/`,
        ),
        apiClient.get<EmergencyEventResponse[]>('/emergency/'),
      ]);
      setMappings(mapResponse);
      setEvents(eventResponse);
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

  const seniorCount = mappings.length;

  // "확인 필요" 판정: 아직 종결되지 않은(false_alarm/resolved 가 아닌) 이벤트를
  // 가진 피보호자. AlertHistoryScreen의 '미확인' 필터와 같은 기준이라 두 화면의
  // 숫자가 어긋나지 않는다.
  const seniorIdsNeedingCheck = new Set(
    events.filter((event) => !isAlertClosed(event.status)).map((event) => event.senior),
  );
  const attentionSeniors = mappings.filter((m) =>
    seniorIdsNeedingCheck.has(m.senior.senior_id),
  );
  const normalSeniors = mappings.filter(
    (m) => !seniorIdsNeedingCheck.has(m.senior.senior_id),
  );

  const seniorNameById = new Map(mappings.map((m) => [m.senior.senior_id, m.senior.name]));

  // 벨 아이콘 빨간 점: 보호자에게 전송됐고 아직 미종결인(status === 'notified')
  // 이벤트가 하나라도 있을 때만. GuardianActivityListScreen의 hasCriticalAlert와
  // 동일 기준이라 두 화면의 신호가 어긋나지 않는다.
  const hasCriticalAlert = events.some((event) => isNotifiedAlert(event.status));

  // 피드는 최근 2건만. created_at은 ISO 문자열이라 사전순 비교가 곧 시간순이다.
  const recentEvents = [...events]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 2);

  const chipNames = (list: GuardianSeniorMapResponse[]) =>
    list.length > 0 ? list.map((m) => `${m.senior.name} 어르신`).join(', ') : '없음';

  const handleOpenAlerts = () => {
    navigation.navigate('AlertHistory');
  };

  const handleGoActivity = () => {
    navigation.navigate('GuardianActivityList');
  };

  const handleAddSenior = () => {
    navigation.navigate('AddSenior');
  };

  return (
    <GuardianTabScreenLayout activeTab="home">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Greeting Box */}
        <View style={styles.welcomeBox}>
          <View>
            <Text style={styles.overline}>환영합니다 보호자님</Text>
            <Text style={styles.welcomeHeading}>{guardianProfile.name} 님</Text>
          </View>
          <Pressable
            onPress={handleOpenAlerts}
            style={({ pressed }) => [styles.bellButton, pressed && styles.pressedOpacity]}
          >
            <Bell size={20} color={colors.textSecondary} />
            {hasCriticalAlert && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {/* 오늘의 현황 요약 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Users size={16} color={colors.primary} />
              <Text style={styles.cardOverline}>오늘의 현황 요약</Text>
            </View>
            <Text style={styles.cardHeaderRight}>실시간 연동 상태</Text>
          </View>

          {loadState === 'loading' ? (
            <Text style={styles.summaryText}>피보호자 목록을 불러오는 중...</Text>
          ) : loadState === 'error' ? (
            <Text style={styles.summaryText}>
              피보호자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </Text>
          ) : (
            <>
              <Text style={styles.summaryText}>
                등록된 피보호자 <Text style={styles.summaryCount}>{seniorCount}명</Text>
              </Text>

              {seniorCount > 0 ? (
                <View style={styles.statusRow}>
                  <View style={[styles.statusChip, styles.statusChipOk]}>
                    <View style={[styles.statusDot, styles.statusDotOk]} />
                    <View style={styles.statusChipBody}>
                      <Text style={styles.statusChipTitle}>
                        정상 {normalSeniors.length}명
                      </Text>
                      <Text style={styles.statusChipName} numberOfLines={2}>
                        {chipNames(normalSeniors)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusChip, styles.statusChipWarn]}>
                    <View style={[styles.statusDot, styles.statusDotWarn]} />
                    <View style={styles.statusChipBody}>
                      <Text style={[styles.statusChipTitle, styles.statusChipTitleWarn]}>
                        확인 필요 {attentionSeniors.length}명
                      </Text>
                      <Text
                        style={[styles.statusChipName, styles.statusChipNameWarn]}
                        numberOfLines={2}
                      >
                        {chipNames(attentionSeniors)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyHint}>
                  아직 등록된 피보호자가 없습니다. 아래 &apos;피보호자 추가&apos;로 등록해 주세요.
                </Text>
              )}
            </>
          )}
        </View>

        {/* 최근 알림 및 활동 피드 카드 - /emergency/ 응답 중 최근 2건. 종결된
            이벤트는 초록, 대응 중인 이벤트는 주황으로 구분한다. */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Clock size={16} color={colors.primary} />
              <Text style={styles.cardOverline}>최근 알림 및 활동 피드</Text>
            </View>
            <Pressable onPress={handleOpenAlerts}>
              <Text style={styles.cardHeaderLink}>전체보기</Text>
            </Pressable>
          </View>

          {loadState === 'loading' ? (
            <Text style={styles.feedPlaceholder}>최근 알림을 불러오는 중...</Text>
          ) : loadState === 'error' ? (
            <Text style={styles.feedPlaceholder}>
              최근 알림을 불러오지 못했습니다.
            </Text>
          ) : recentEvents.length === 0 ? (
            <Text style={styles.feedPlaceholder}>
              아직 기록된 안전 알림이 없습니다.
            </Text>
          ) : (
            <View style={styles.feedList}>
              {recentEvents.map((event) => {
                const closed = isAlertClosed(event.status);
                return (
                  <View
                    key={event.event_id}
                    style={[
                      styles.feedItem,
                      closed ? styles.feedItemOk : styles.feedItemWarn,
                    ]}
                  >
                    <View
                      style={[
                        styles.feedIcon,
                        closed ? styles.feedIconOk : styles.feedIconWarn,
                      ]}
                    >
                      {closed ? (
                        <CheckCircle2 size={16} color={colors.primary} />
                      ) : (
                        <AlertTriangle size={16} color={colors.amberIcon} />
                      )}
                    </View>

                    <View style={styles.feedBody}>
                      <View style={styles.feedTopRow}>
                        <Text style={styles.feedName}>
                          {seniorNameById.get(event.senior) ?? '피보호자'} 어르신
                        </Text>
                        <Text style={styles.feedTime}>
                          {formatEmergencyTimestamp(event.created_at)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.feedTitle,
                          closed ? styles.feedTitleOk : styles.feedTitleWarn,
                        ]}
                      >
                        {EMERGENCY_TYPE_LABELS[event.event_type]}
                      </Text>
                      <Text style={styles.feedDesc}>
                        {EMERGENCY_STATUS_LABELS[event.status]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 빠른 이동 카드 2개 */}
        <View style={styles.quickNavRow}>
          <Pressable
            onPress={handleGoActivity}
            style={({ pressed }) => [
              styles.quickNavCard,
              styles.quickNavCardPrimary,
              pressed && styles.quickNavCardPrimaryPressed,
            ]}
          >
            <Activity size={22} color={colors.white} strokeWidth={2} />
            <View>
              <Text style={styles.quickNavOverlinePrimary}>피보호자 관리</Text>
              <View style={styles.quickNavTitleRow}>
                <Text style={styles.quickNavTitlePrimary}>활동 기록 보기</Text>
                <ArrowRight size={13} color={colors.white} />
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={handleAddSenior}
            style={({ pressed }) => [
              styles.quickNavCard,
              styles.quickNavCardSecondary,
              pressed && styles.pressedOpacity,
            ]}
          >
            <Plus size={22} color={colors.primary} strokeWidth={2.5} />
            <View>
              <Text style={styles.quickNavOverlineSecondary}>기기 연동</Text>
              <View style={styles.quickNavTitleRow}>
                <Text style={styles.quickNavTitleSecondary}>피보호자 추가</Text>
                <ArrowRight size={13} color={colors.disabledText} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Info Footnote */}
        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>
            실버비전은 AI 관절 스켈레톤 추적 및 비접촉 스마트 센싱 기술을 적용해 365일 실시간
            관제를 도우며, 사생활 유출을 차단합니다.
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md + spacing.xs,
    gap: spacing.sm + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardOverline: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeaderRight: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  cardHeaderLink: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  summaryText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  summaryCount: {
    fontSize: guardianFontSizes.input,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  emptyHint: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  feedPlaceholder: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm + spacing.xs,
  },
  statusChipOk: {
    backgroundColor: colors.emeraldBackground,
    borderColor: colors.emeraldBorderLight,
  },
  statusChipWarn: {
    backgroundColor: colors.amberBackground,
    borderColor: colors.amberCardBorder,
  },
  // 이름을 여러 개 나열하면 칩 폭을 넘기므로 텍스트 영역을 별도로 감싼다
  // (main은 피보호자가 1명뿐인 목업이라 이 래퍼가 없었다).
  statusChipBody: {
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotOk: {
    backgroundColor: colors.primary,
  },
  statusDotWarn: {
    backgroundColor: colors.amberFill,
  },
  statusChipTitle: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  statusChipTitleWarn: {
    color: colors.amberTextDeep,
  },
  statusChipName: {
    fontSize: guardianFontSizes.tiny,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  statusChipNameWarn: {
    color: colors.amberText,
  },
  feedList: {
    gap: spacing.sm + spacing.xs,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
  },
  feedItemWarn: {
    backgroundColor: colors.amberBackground,
    borderColor: colors.amberCardBorder,
  },
  feedItemOk: {
    backgroundColor: colors.emeraldBackground,
    borderColor: colors.emeraldBorderLight,
  },
  feedIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedIconWarn: {
    backgroundColor: colors.amberIconBackground,
  },
  feedIconOk: {
    backgroundColor: colors.emeraldTextLight,
  },
  feedBody: {
    flex: 1,
  },
  feedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  feedName: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  feedTime: {
    fontSize: guardianFontSizes.tiny,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  feedTitle: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    marginTop: spacing.xs,
  },
  feedTitleWarn: {
    color: colors.amberText,
  },
  feedTitleOk: {
    color: colors.primary,
  },
  feedDesc: {
    fontSize: guardianFontSizes.tiny,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
  },
  quickNavCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  quickNavCardPrimary: {
    backgroundColor: colors.primary,
  },
  quickNavCardPrimaryPressed: {
    backgroundColor: '#1B5E20',
  },
  quickNavCardSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickNavOverlinePrimary: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.emeraldTextLight,
  },
  quickNavOverlineSecondary: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  quickNavTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  quickNavTitlePrimary: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  quickNavTitleSecondary: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
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
