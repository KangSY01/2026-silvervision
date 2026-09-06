import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, ChevronRight, LineChart, MapPin, Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import {
  apiClient,
  getSession,
  SeniorProfileResponse,
  SeniorRankingResponse,
} from '../../api/client';
import TabScreenLayout from '../../components/TabScreenLayout';
import { useAppState } from '../../context/AppStateContext';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';

const MAX_FRUITS = 6;

// 순위 로드 상태. 시니어 화면이라 로딩/에러/빈 상태 모두 숫자 자리에 짧고 분명한
// 문구로 대체해 카드 레이아웃이 흔들리지 않게 한다.
type RankingLoadState = 'loading' | 'ready' | 'error';

// 스냅샷이 있으면 "N위"(isNumber), 없으면(신규 가입·이번 달 완료 세션 0건) "기록 없음".
function rankDisplay(
  state: RankingLoadState,
  snapshot: SeniorRankingResponse['national'],
): { value: string; isNumber: boolean } {
  if (state === 'loading') return { value: '불러오는 중', isNumber: false };
  if (state === 'error') return { value: '표시할 수 없음', isNumber: false };
  if (!snapshot || snapshot.rank_position == null) return { value: '기록 없음', isNumber: false };
  return { value: String(snapshot.rank_position), isNumber: true };
}

const FRUIT_COORDS = [
  { cx: 120, cy: 110 }, // 왼쪽 가지
  { cx: 280, cy: 120 }, // 오른쪽 가지
  { cx: 160, cy: 70 }, // 좌상단
  { cx: 230, cy: 75 }, // 우상단
  { cx: 140, cy: 155 }, // 좌하단
  { cx: 250, cy: 165 }, // 우하단
];

export default function SeniorHomeScreen() {
  const navigation = useNavigation();
  const { userProfile, setUserProfile } = useAppState();
  const userName = userProfile.name;

  const [ranking, setRanking] = useState<SeniorRankingResponse | null>(null);
  const [rankingState, setRankingState] = useState<RankingLoadState>('loading');

  // 화면 진입/복귀(useFocusEffect)마다 순위와 fruit_count를 다시 불러온다.
  // 로그인 시점 캐싱(지난 배치 패턴)이 아니라 포커스 시 조회를 택한 이유: 둘 다
  // 운동 세션 완료 시점에 백엔드가 갱신하는 값이고, SeniorHome은 운동 피드백 뒤
  // 되돌아오는 화면이라 로그인 값만 캐싱하면 즉시 낡는다. flat 스택이라 탭 복귀 시
  // 화면이 언마운트되지 않아 useEffect([])로는 재조회가 안 되므로 useFocusEffect를 쓴다.
  const loadHomeSummary = useCallback(async () => {
    // 최초 로드만 'loading'을 노출한다. 이미 값을 한 번 받아온 뒤의 포커스 재조회는
    // 이전 순위를 그대로 두고 조용히 갱신해 탭 복귀마다 "불러오는 중"이 깜빡이지 않게 한다.
    setRankingState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setRankingState('error');
        return;
      }
      const [profile, rankingResponse] = await Promise.all([
        apiClient.get<SeniorProfileResponse>(`/senior/${session.userId}/`),
        apiClient.get<SeniorRankingResponse>(`/senior/${session.userId}/ranking/`),
      ]);
      setRanking(rankingResponse);
      // fruit_count 단일 소스는 userProfile. 함수형 업데이트라 loadHomeSummary가
      // userProfile에 의존하지 않고, 값이 실제로 바뀐 경우만 새 객체를 만든다
      // (포커스마다 딱 한 번만 조회되도록).
      setUserProfile((prev) =>
        prev.fruitCount === profile.fruit_count
          ? prev
          : { ...prev, fruitCount: profile.fruit_count },
      );
      setRankingState('ready');
    } catch {
      // 네트워크 실패 등 - 화면(인사말/나무)은 그대로 두고 순위 자리에만 안내 문구.
      setRankingState('error');
    }
  }, [setUserProfile]);

  useFocusEffect(
    useCallback(() => {
      loadHomeSummary();
    }, [loadHomeSummary]),
  );

  const fruitsCollected = Math.max(0, Math.min(userProfile.fruitCount, MAX_FRUITS));
  const fruitSlots = Array.from({ length: MAX_FRUITS }, (_, index) => index < fruitsCollected);

  const nationalRank = rankDisplay(rankingState, ranking?.national ?? null);
  const regionalRank = rankDisplay(rankingState, ranking?.regional ?? null);

  return (
    <TabScreenLayout activeTab="home">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Welcome Bar */}
        <LinearGradient
          colors={[colors.primaryTintBackground, colors.background]}
          style={styles.welcomeBar}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>실버클럽 어르신</Text>
          </View>
          <Text style={styles.greetingName}>{userName} 어르신,</Text>
          <View style={styles.greetingSubRow}>
            <Sparkles size={18} color={colors.amberFill} fill={colors.amberFill} />
            <Text style={styles.greetingSubtitle}>오늘도 참 건강하고 건강하세요!</Text>
          </View>
        </LinearGradient>

        {/* Main Ranking Cards */}
        <View style={styles.rankRow}>
          <View style={styles.rankCard}>
            <View style={[styles.rankIconWrap, { backgroundColor: colors.amberBackground }]}>
              <Award size={28} color={colors.amberIcon} strokeWidth={2.5} />
            </View>
            <View style={styles.rankTextArea}>
              <Text style={styles.rankLabel}>전국 순위</Text>
              <Text style={[styles.rankValue, !nationalRank.isNumber && styles.rankValueText]}>
                {nationalRank.value}
                {nationalRank.isNumber ? <Text style={styles.rankUnit}>위</Text> : null}
              </Text>
            </View>
          </View>

          <View style={styles.rankCard}>
            <View style={[styles.rankIconWrap, { backgroundColor: colors.emeraldBackground }]}>
              <MapPin size={28} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.rankTextArea}>
              <Text style={styles.rankLabel}>지역 순위</Text>
              <Text style={[styles.rankValue, !regionalRank.isNumber && styles.rankValueText]}>
                {regionalRank.value}
                {regionalRank.isNumber ? <Text style={styles.rankUnit}>위</Text> : null}
              </Text>
            </View>
          </View>
        </View>

        {/* Center Interactive Fruit Tree Illustration */}
        <View style={styles.treeSection}>
          <View style={styles.treeCard}>
            <View style={styles.treeCardTopRow}>
              <View style={styles.treeCardBadge}>
                <Text style={styles.treeCardBadgeText}>🌳 어르신 건강 나무</Text>
              </View>
              <Text style={styles.treeCardHint}>매일 운동완료시 수확</Text>
            </View>

            <View style={styles.treeSvgWrap}>
              <Svg width="100%" height={220} viewBox="0 0 400 240">
                {/* Trunk */}
                <Path
                  d="M180 240 C180 200, 190 170, 190 160 C190 150, 210 150, 210 160 C210 170, 220 200, 220 240 Z"
                  fill={colors.treeTrunk}
                />
                <Path
                  d="M190 160 Q150 140, 130 110"
                  stroke={colors.treeTrunk}
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                />
                <Path
                  d="M210 160 Q250 150, 270 120"
                  stroke={colors.treeTrunk}
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                />
                <Path
                  d="M200 150 Q200 100, 180 70"
                  stroke={colors.treeTrunk}
                  strokeWidth={6}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Foliage */}
                <Circle cx={140} cy={110} r={45} fill={colors.treeLeafDark} opacity={0.9} />
                <Circle cx={260} cy={120} r={45} fill={colors.treeLeafMid} opacity={0.85} />
                <Circle cx={200} cy={80} r={50} fill={colors.treeLeafDeep} opacity={0.95} />
                <Circle cx={160} cy={150} r={35} fill={colors.treeLeafLight} opacity={0.8} />
                <Circle cx={240} cy={160} r={35} fill={colors.treeLeafPale} opacity={0.8} />

                {/* Fruits */}
                {FRUIT_COORDS.map((coord, idx) =>
                  fruitSlots[idx] ? (
                    <G key={idx}>
                      <Path
                        d={`M${coord.cx} ${coord.cy - 12} Q${coord.cx + 5} ${coord.cy - 18}, ${coord.cx + 8} ${coord.cy - 14}`}
                        stroke={colors.treeLeafDeep}
                        strokeWidth={2}
                        fill="none"
                      />
                      <Circle cx={coord.cx} cy={coord.cy} r={14} fill={colors.danger} />
                      <Circle
                        cx={coord.cx - 4}
                        cy={coord.cy - 4}
                        r={4}
                        fill={colors.white}
                        opacity={0.6}
                      />
                    </G>
                  ) : (
                    <G key={idx}>
                      <Circle
                        cx={coord.cx}
                        cy={coord.cy}
                        r={14}
                        fill={colors.white}
                        stroke={colors.textSecondary}
                        strokeWidth={2.5}
                        strokeDasharray="4,4"
                        opacity={0.85}
                      />
                      <SvgText
                        x={coord.cx}
                        y={coord.cy + 5}
                        textAnchor="middle"
                        fill={colors.textSecondary}
                        fontSize={14}
                        fontWeight="bold"
                      >
                        +
                      </SvgText>
                    </G>
                  ),
                )}
              </Svg>
            </View>

            <View style={styles.treeCardFooter}>
              <View style={styles.fruitCountRow}>
                <Text style={styles.fruitCountValue}>{fruitsCollected}</Text>
                <Text style={styles.fruitCountDivider}>/</Text>
                <Text style={styles.fruitCountLabel}>6 개 열매 획득</Text>
              </View>
              <Text style={styles.treeCardMessage}>
                {fruitsCollected < 6
                  ? `나무 완성까지 앞으로 열매가 ${6 - fruitsCollected}개 더 필요해요!`
                  : '축하합니다! 이번 주 건강 열매가 풍성하게 열렸어요! 🎉'}
              </Text>
            </View>
          </View>
        </View>

        {/* 건강 변화 추적 화면 진입 */}
        <View style={styles.abilitySection}>
          <Pressable
            onPress={() => navigation.navigate('AbilityHistory')}
            style={({ pressed }) => [styles.abilityCard, pressed && styles.abilityCardPressed]}
          >
            <View style={styles.abilityIconWrap}>
              <LineChart size={28} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.abilityTextArea}>
              <Text style={styles.abilityTitle}>내 건강 변화 보기</Text>
              <Text style={styles.abilityDescription}>
                관절 가동범위·동작 완성도가 2주간 어떻게 변했는지 그래프로 확인해요.
              </Text>
            </View>
            <ChevronRight size={24} color={colors.disabledText} strokeWidth={2.5} />
          </Pressable>
        </View>
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  welcomeBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  greetingName: {
    fontSize: 26,
    fontWeight: fontWeights.black,
    color: colors.text,
    marginTop: spacing.sm,
  },
  greetingSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  greetingSubtitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  rankRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rankCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  rankIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTextArea: {
    flex: 1,
  },
  rankLabel: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  rankValue: {
    fontSize: 24,
    fontWeight: fontWeights.black,
    color: colors.text,
    marginTop: spacing.xs,
  },
  // 로딩/에러/"기록 없음"처럼 숫자가 아닌 안내 문구일 때: 좁은 카드에서 줄바꿈되며
  // 읽히도록 본문 크기(20pt, 시니어 UI 규칙 하한)로 낮춘다.
  rankValueText: {
    fontSize: fontSizes.body,
  },
  rankUnit: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  treeSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  treeCard: {
    width: '100%',
    maxWidth: 350,
    minHeight: 380,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
  },
  treeCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treeCardBadge: {
    backgroundColor: colors.emeraldBackground,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  treeCardBadgeText: {
    fontSize: 16,
    fontWeight: fontWeights.black,
    color: colors.treeLeafDeep,
  },
  treeCardHint: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  treeSvgWrap: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  treeCardFooter: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  fruitCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fruitCountValue: {
    fontSize: 26,
    fontWeight: fontWeights.black,
    color: colors.danger,
  },
  fruitCountDivider: {
    fontSize: 26,
    fontWeight: fontWeights.black,
    color: colors.borderLight,
  },
  fruitCountLabel: {
    fontSize: 26,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
  },
  treeCardMessage: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  abilitySection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  abilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  abilityCardPressed: {
    backgroundColor: colors.primarySoftBackground,
  },
  abilityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.emeraldBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityTextArea: {
    flex: 1,
  },
  abilityTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  abilityDescription: {
    fontSize: 15,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
});
