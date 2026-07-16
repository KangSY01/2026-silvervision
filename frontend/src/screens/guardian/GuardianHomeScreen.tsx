import { useNavigation } from '@react-navigation/native';
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

export default function GuardianHomeScreen() {
  const navigation = useNavigation();
  const { guardianProfile } = useAppState();

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
            <View style={styles.bellDot} />
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

          <Text style={styles.summaryText}>
            등록된 피보호자 <Text style={styles.summaryCount}>2명</Text>
          </Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusChip, styles.statusChipOk]}>
              <View style={[styles.statusDot, styles.statusDotOk]} />
              <View>
                <Text style={styles.statusChipTitle}>정상 1명</Text>
                <Text style={styles.statusChipName}>김철수 어르신</Text>
              </View>
            </View>

            <View style={[styles.statusChip, styles.statusChipWarn]}>
              <View style={[styles.statusDot, styles.statusDotWarn]} />
              <View>
                <Text style={[styles.statusChipTitle, styles.statusChipTitleWarn]}>
                  확인 필요 1명
                </Text>
                <Text style={[styles.statusChipName, styles.statusChipNameWarn]}>
                  이순자 어르신
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 최근 알림 및 활동 피드 카드 */}
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

          <View style={styles.feedList}>
            <View style={[styles.feedItem, styles.feedItemWarn]}>
              <View style={[styles.feedIcon, styles.feedIconWarn]}>
                <AlertTriangle size={16} color={colors.amberIcon} />
              </View>
              <View style={styles.feedBody}>
                <View style={styles.feedTopRow}>
                  <Text style={styles.feedName}>이순자 어르신</Text>
                  <Text style={styles.feedTime}>2시간 전</Text>
                </View>
                <Text style={[styles.feedTitle, styles.feedTitleWarn]}>오늘 미접속 감지</Text>
                <Text style={styles.feedDesc}>오늘 스마트 안전 카메라인식 없음</Text>
              </View>
            </View>

            <View style={[styles.feedItem, styles.feedItemOk]}>
              <View style={[styles.feedIcon, styles.feedIconOk]}>
                <CheckCircle2 size={16} color={colors.primary} />
              </View>
              <View style={styles.feedBody}>
                <View style={styles.feedTopRow}>
                  <Text style={styles.feedName}>김철수 어르신</Text>
                  <Text style={styles.feedTime}>오전 9:15</Text>
                </View>
                <Text style={[styles.feedTitle, styles.feedTitleOk]}>스트레칭 완료</Text>
                <Text style={styles.feedDesc}>오늘의 스마트 맞춤 운동을 정상 이수하였습니다.</Text>
              </View>
            </View>
          </View>
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
