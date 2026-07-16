import { LinearGradient } from 'expo-linear-gradient';
import { Award, MapPin, Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import TabScreenLayout from '../../components/TabScreenLayout';
import { useAppState } from '../../context/AppStateContext';
import {
  colors,
  fontSizes,
  fontWeights,
  radius,
  spacing,
} from '../../theme/theme';

const FRUIT_COORDS = [
  { cx: 120, cy: 110 }, // 왼쪽 가지
  { cx: 280, cy: 120 }, // 오른쪽 가지
  { cx: 160, cy: 70 }, // 좌상단
  { cx: 230, cy: 75 }, // 우상단
  { cx: 140, cy: 155 }, // 좌하단
  { cx: 250, cy: 165 }, // 우하단
];

export default function SeniorHomeScreen() {
  const { userProfile, fruitsCollected } = useAppState();
  const userName = userProfile.name;

  const fruitSlots = Array.from({ length: 6 }, (_, index) => index < fruitsCollected);

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
            <View>
              <Text style={styles.rankLabel}>전국 순위</Text>
              <Text style={styles.rankValue}>
                247<Text style={styles.rankUnit}>위</Text>
              </Text>
            </View>
          </View>

          <View style={styles.rankCard}>
            <View style={[styles.rankIconWrap, { backgroundColor: colors.emeraldBackground }]}>
              <MapPin size={28} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.rankLabel}>지역 순위</Text>
              <Text style={styles.rankValue}>
                12<Text style={styles.rankUnit}>위</Text>
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
});
