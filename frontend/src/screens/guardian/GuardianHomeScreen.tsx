import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Activity,
  ArrowRight,
  Bell,
  Clock,
  Plus,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient, getSession, GuardianSeniorMapResponse } from '../../api/client';
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

type ListLoadState = 'loading' | 'ready' | 'error';

export default function GuardianHomeScreen() {
  const navigation = useNavigation();
  const { guardianProfile } = useAppState();

  const [mappings, setMappings] = useState<GuardianSeniorMapResponse[]>([]);
  const [loadState, setLoadState] = useState<ListLoadState>('loading');

  // 화면 진입/복귀마다 매핑 목록을 다시 불러온다(SeniorHomeScreen의 useFocusEffect
  // 패턴 재사용). AddSeniorScreen에서 등록을 마치고 이 화면으로 돌아오면 바로
  // 반영되어야 하는데, flat 스택이라 화면이 언마운트되지 않아 useEffect([])로는
  // 재조회가 안 된다. 최초 로드만 'loading'을 노출하고 이후 포커스 재조회는
  // 기존 목록을 둔 채 조용히 갱신한다.
  const loadMappings = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const response = await apiClient.get<GuardianSeniorMapResponse[]>(
        `/guardian/${session.userId}/seniors/`,
      );
      setMappings(response);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMappings();
    }, [loadMappings]),
  );

  const seniorCount = mappings.length;

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

              {/* "정상 / 확인 필요" 상태 구분은 응급 이벤트·활동 로그를 봐야 알 수
                  있어(AlertHistoryScreen 연동 시 다음 배치에서 처리) 이번 배치에서는
                  임의 규칙으로 색을 칠하지 않고 등록된 피보호자 이름만 나열한다 -
                  허위 안심을 주지 않기 위함. */}
              {seniorCount > 0 ? (
                <View style={styles.nameChipRow}>
                  {mappings.map((mapping) => (
                    <View key={mapping.map_id} style={styles.nameChip}>
                      <Text style={styles.nameChipText}>{mapping.senior.name} 어르신</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyHint}>
                  아직 등록된 피보호자가 없습니다. 아래 &apos;피보호자 추가&apos;로 등록해 주세요.
                </Text>
              )}
            </>
          )}
        </View>

        {/* 최근 알림 및 활동 피드 카드 - AlertHistoryScreen 연동(다음 배치)에서 실제
            데이터로 채운다. 지금은 실제 등록 피보호자와 맞지 않는 목업 이름을 띄우면
            오히려 오해를 부르므로 안내 문구로만 둔다. */}
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

          <Text style={styles.feedPlaceholder}>
            어르신의 최근 활동·안전 알림 요약은 다음 업데이트에서 제공됩니다.
          </Text>
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
  nameChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + spacing.xs,
  },
  nameChip: {
    backgroundColor: colors.primaryTintBackground,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + spacing.xs,
  },
  nameChipText: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.primary,
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
