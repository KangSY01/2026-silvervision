import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../../context/AppStateContext';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import { EmergencyEvent } from '../../types';

type FilterKey = 'all' | 'unconfirmed' | 'resolved';

export default function AlertHistoryScreen() {
  const navigation = useNavigation();
  const { alerts } = useAppState();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unconfirmed') return alert.status === '미확인';
    if (filter === 'resolved') return alert.status !== '미확인';
    return true;
  });

  const unconfirmedCount = alerts.filter((alert) => alert.status === '미확인').length;
  const resolvedCount = alerts.filter((alert) => alert.status !== '미확인').length;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSelectAlert = (alert: EmergencyEvent) => {
    navigation.navigate('AlertDetail', { alertId: alert.id });
  };

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
              전체 ({alerts.length})
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
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle2 size={28} color={colors.disabledText} />
            </View>
            <Text style={styles.emptyTitle}>감지된 기록이 없습니다</Text>
            <Text style={styles.emptySubtitle}>현재 모든 어르신들이 안전한 상태입니다.</Text>
          </View>
        ) : (
          filteredAlerts.map((alert) => {
            let cardStyle = styles.card;
            let iconWrapStyle = styles.iconWrapNeutral;
            let iconColor = colors.danger;
            let badgeStyle = styles.badgeNeutral;
            let badgeTextStyle = styles.badgeTextNeutral;
            let displayStatus: string = alert.status;

            if (alert.status === '미확인') {
              cardStyle = styles.cardUnconfirmed;
              iconWrapStyle = styles.iconWrapUnconfirmed;
              badgeStyle = styles.badgeUnconfirmed;
              badgeTextStyle = styles.badgeTextUnconfirmed;
            } else if (alert.status === '확인됨') {
              iconColor = colors.primary;
              iconWrapStyle = styles.iconWrapOk;
              badgeStyle = styles.badgeOk;
              badgeTextStyle = styles.badgeTextOk;
            } else if (alert.status === '오탐') {
              iconColor = colors.amberIcon;
              iconWrapStyle = styles.iconWrapWarn;
              badgeStyle = styles.badgeWarn;
              badgeTextStyle = styles.badgeTextWarn;
              displayStatus = '오보';
            }

            return (
              <Pressable
                key={alert.id}
                onPress={() => handleSelectAlert(alert)}
                style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
              >
                <View style={styles.cardLeft}>
                  <View style={iconWrapStyle}>
                    <ShieldAlert size={22} color={iconColor} />
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardName}>{alert.seniorName} 어르신</Text>
                      <View style={badgeStyle}>
                        <Text style={badgeTextStyle}>{displayStatus}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMessage}>{alert.message}</Text>
                    <View style={styles.cardTimeRow}>
                      <Clock size={11} color={colors.disabledText} />
                      <Text style={styles.cardTime}>{alert.timestamp}</Text>
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
  iconWrapNeutral: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.grayBadgeBackground,
    alignItems: 'center',
    justifyContent: 'center',
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
  badgeNeutral: {
    backgroundColor: colors.grayBadgeBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  badgeTextNeutral: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
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
