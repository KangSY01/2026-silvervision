import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  ShieldAlert,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  apiClient,
  EmergencyEventResponse,
  getSession,
  GuardianSeniorMapResponse,
} from '../../api/client';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import {
  AlertFilterKey,
  EMERGENCY_STATUS_LABELS,
  EMERGENCY_TYPE_LABELS,
  formatEmergencyTimestamp,
  isAlertClosed,
  matchesAlertFilter,
} from './emergency';

type LoadState = 'loading' | 'ready' | 'error';

export default function AlertHistoryScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<AlertFilterKey>('all');
  const [events, setEvents] = useState<EmergencyEventResponse[]>([]);
  const [seniorNames, setSeniorNames] = useState<Record<number, string>>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');

  // 화면 진입/복귀마다 다시 불러온다(상세에서 상태를 바꾸고 돌아오면 목록에 반영돼야
  // 하므로). GET /emergency/ 는 이미 보호자 매핑 기준으로 필터링돼서 오고,
  // senior 이름은 nested되지 않아 GET /guardian/{id}/seniors/ 를 함께 불러와
  // senior_id → 이름 맵을 만든다.
  const loadAlerts = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const [eventList, mappings] = await Promise.all([
        apiClient.get<EmergencyEventResponse[]>('/emergency/'),
        apiClient.get<GuardianSeniorMapResponse[]>(`/guardian/${session.userId}/seniors/`),
      ]);
      setEvents(eventList);
      setSeniorNames(
        Object.fromEntries(mappings.map((m) => [m.senior.senior_id, m.senior.name])),
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts]),
  );

  const unconfirmedCount = useMemo(
    () => events.filter((e) => !isAlertClosed(e.status)).length,
    [events],
  );
  const resolvedCount = events.length - unconfirmedCount;
  const filteredEvents = events.filter((e) => matchesAlertFilter(e.status, filter));

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSelectAlert = (event: EmergencyEventResponse) => {
    navigation.navigate('AlertDetail', { eventId: event.event_id });
  };

  const seniorLabel = (seniorId: number) => seniorNames[seniorId] ?? `어르신 #${seniorId}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>보호자 홈으로</Text>
        </Pressable>

        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Bell size={22} color={colors.danger} strokeWidth={2.5} />
            <Text style={styles.title}>긴급 알림 기록</Text>
          </View>
          {unconfirmedCount > 0 ? (
            <View style={styles.unconfirmedBadge}>
              <Text style={styles.unconfirmedBadgeText}>미확인 {unconfirmedCount}건</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.subtitle}>
          인공지능 분석 카메라가 감지한 피보호자 어르신의 이상 행동 기록입니다.
        </Text>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[styles.filterPill, filter === 'all' && styles.filterPillActiveAll]}
          >
            <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
              전체 ({events.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('unconfirmed')}
            style={[
              styles.filterPill,
              filter === 'unconfirmed' && styles.filterPillActiveUnconfirmed,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === 'unconfirmed' && styles.filterPillTextActive,
              ]}
            >
              미확인 ({unconfirmedCount})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('resolved')}
            style={[styles.filterPill, filter === 'resolved' && styles.filterPillActiveResolved]}
          >
            <Text
              style={[styles.filterPillText, filter === 'resolved' && styles.filterPillTextActive]}
            >
              확인완료 ({resolvedCount})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Alert List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loadState === 'loading' ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>알림 기록을 불러오는 중...</Text>
          </View>
        ) : loadState === 'error' ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Info size={28} color={colors.danger} />
            </View>
            <Text style={styles.emptyTitle}>기록을 불러오지 못했습니다</Text>
            <Text style={styles.emptySubtitle}>잠시 후 다시 시도해 주세요.</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle2 size={28} color={colors.disabledText} />
            </View>
            <Text style={styles.emptyTitle}>감지된 기록이 없습니다</Text>
            <Text style={styles.emptySubtitle}>현재 모든 어르신들이 안전한 상태입니다.</Text>
          </View>
        ) : (
          filteredEvents.map((event) => {
            const closed = isAlertClosed(event.status);
            const isFalseAlarm = event.status === 'false_alarm';

            let cardStyle = styles.cardUnconfirmed;
            let iconWrapStyle = styles.iconWrapUnconfirmed;
            let iconColor = colors.danger;
            let badgeStyle = styles.badgeUnconfirmed;
            let badgeTextStyle = styles.badgeTextUnconfirmed;

            if (isFalseAlarm) {
              cardStyle = styles.card;
              iconWrapStyle = styles.iconWrapWarn;
              iconColor = colors.amberIcon;
              badgeStyle = styles.badgeWarn;
              badgeTextStyle = styles.badgeTextWarn;
            } else if (closed) {
              cardStyle = styles.card;
              iconWrapStyle = styles.iconWrapOk;
              iconColor = colors.primary;
              badgeStyle = styles.badgeOk;
              badgeTextStyle = styles.badgeTextOk;
            }

            return (
              <Pressable
                key={event.event_id}
                onPress={() => handleSelectAlert(event)}
                style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
              >
                <View style={styles.cardLeft}>
                  <View style={iconWrapStyle}>
                    <ShieldAlert size={22} color={iconColor} />
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName}>{seniorLabel(event.senior)} 어르신</Text>
                      <View style={badgeStyle}>
                        <Text style={badgeTextStyle}>{EMERGENCY_STATUS_LABELS[event.status]}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMessage}>
                      {EMERGENCY_TYPE_LABELS[event.event_type]} 감지
                    </Text>
                    <View style={styles.cardTimeRow}>
                      <Clock size={11} color={colors.disabledText} />
                      <Text style={styles.cardTime}>
                        {formatEmergencyTimestamp(event.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                <ChevronRight size={18} color={colors.border} strokeWidth={2.5} />
              </Pressable>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: guardianFontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  unconfirmedBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  unconfirmedBadgeText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  subtitle: {
    fontSize: guardianFontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: spacing.sm + spacing.xs,
  },
  filterPill: {
    minHeight: 32,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  filterPillActiveAll: {
    backgroundColor: colors.primary,
  },
  filterPillActiveUnconfirmed: {
    backgroundColor: colors.danger,
  },
  filterPillActiveResolved: {
    backgroundColor: colors.textMuted,
  },
  filterPillText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.sm + spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.grayBadgeBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  emptySubtitle: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.border,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardUnconfirmed: {
    backgroundColor: 'rgba(254, 242, 242, 0.35)',
    borderWidth: 1,
    borderColor: colors.dangerBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardPressed: {
    borderColor: colors.primary,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
    flex: 1,
  },
  iconWrapUnconfirmed: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOk: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.emeraldBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapWarn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.amberBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardName: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  badgeUnconfirmed: {
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  badgeTextUnconfirmed: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.danger,
  },
  badgeOk: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  badgeTextOk: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  badgeWarn: {
    backgroundColor: colors.amberBackground,
    borderWidth: 1,
    borderColor: colors.amberCardBorder,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  badgeTextWarn: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.amberText,
  },
  cardMessage: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  cardTime: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
