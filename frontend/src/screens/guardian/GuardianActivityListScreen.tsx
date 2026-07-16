import { useNavigation } from '@react-navigation/native';
import { Activity, ArrowRight, Bell, Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { Senior } from '../../types';

export default function GuardianActivityListScreen() {
  const navigation = useNavigation();
  const { seniors } = useAppState();

  const hasCriticalAlert = seniors.some((senior) => senior.status === 'fall_detected');

  const handleOpenAlerts = () => {
    navigation.navigate('AlertHistory');
  };

  const handleAddSenior = () => {
    navigation.navigate('AddSenior');
  };

  const handleSelectSenior = (senior: Senior) => {
    navigation.navigate('SeniorDetail', { seniorId: senior.id });
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
            <Text style={styles.listHeading}>모니터링 피보호자 ({seniors.length}명)</Text>
            <Text style={styles.listHeaderRight}>실시간 분석 중</Text>
          </View>

          <View style={styles.cardList}>
            {seniors.map((senior) => {
              let statusStyle = styles.statusChipOk;
              let statusTextStyle = styles.statusChipTextOk;
              let cardStyle = styles.card;
              let statusText = '오늘 스트레칭 완료 ✓';

              if (senior.status === 'not_connected') {
                statusStyle = styles.statusChipWarn;
                statusTextStyle = styles.statusChipTextWarn;
                cardStyle = styles.cardWarn;
                statusText = '오늘 미접속 ⚠️';
              } else if (senior.status === 'fall_detected') {
                statusStyle = styles.statusChipDanger;
                statusTextStyle = styles.statusChipTextDanger;
                cardStyle = styles.cardDanger;
                statusText = '🚨 낙상 의심 감지';
              }

              return (
                <Pressable
                  key={senior.id}
                  onPress={() => handleSelectSenior(senior)}
                  style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTopLeft}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{senior.avatarInitials}</Text>
                      </View>
                      <View>
                        <View style={styles.cardNameRow}>
                          <Text style={styles.cardName}>{senior.name} 어르신</Text>
                          <Text style={styles.cardId}>(ID: {senior.id})</Text>
                        </View>
                        <View style={styles.cardSubRow}>
                          <Activity size={14} color={colors.primary} />
                          <Text style={styles.cardSubtext}>
                            이번 주 총 {senior.weeklyWorkoutCount}회 운동 수행
                          </Text>
                        </View>
                      </View>
                    </View>
                    <ArrowRight size={16} color={colors.border} />
                  </View>

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.cardFooterLabel}>오늘의 안전 요약</Text>
                    <View style={statusStyle}>
                      <Text style={statusTextStyle}>{statusText}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
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
