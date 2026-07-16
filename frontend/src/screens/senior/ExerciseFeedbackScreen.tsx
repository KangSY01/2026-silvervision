import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useAppState } from '../../context/AppStateContext';
import { RootStackParamList } from '../../navigation/types';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';

const SCORE = 87;

type Route = NativeStackScreenProps<RootStackParamList, 'ExerciseFeedback'>['route'];

export default function ExerciseFeedbackScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const { workout } = params;
  const { incrementFruitsCollected } = useAppState();

  const handleConfirm = () => {
    incrementFruitsCollected();
    navigation.navigate('SeniorHome');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>운동 분석 결과</Text>
        <Text style={styles.subtitle}>
          인공지능 분석기로 {workout.name} 동작을 분석했습니다.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Joint Diagram Card */}
        <View style={styles.diagramCard}>
          <View style={styles.diagramBadge}>
            <Text style={styles.diagramBadgeText}>📊 관절 정확도 정밀 평가</Text>
          </View>

          <View style={styles.diagramSvgWrap}>
            <Svg width="100%" height="100%" viewBox="0 0 200 220">
              {/* 신체 실루엣 */}
              <Path
                d="M100,25 C110,25 118,33 118,43 C118,53 110,61 100,61 C90,61 82,53 82,43 C82,33 90,25 100,25 Z M100,65 L100,135 M100,75 L45,95 M100,75 L155,70 M100,135 L75,195 M100,135 L125,195"
                stroke={colors.silhouette}
                strokeWidth={20}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.8}
              />

              {/* 척추 */}
              <Line x1={100} y1={58} x2={100} y2={135} stroke={colors.jointLineNeutral} strokeWidth={4} />
              {/* 정확한 오른팔 */}
              <Line x1={100} y1={75} x2={50} y2={105} stroke={colors.primary} strokeWidth={4} strokeLinecap="round" />
              {/* 교정 필요 왼팔 */}
              <Line x1={100} y1={75} x2={150} y2={90} stroke={colors.danger} strokeWidth={4} strokeLinecap="round" />
              {/* 다리 */}
              <Line x1={100} y1={135} x2={75} y2={195} stroke={colors.primary} strokeWidth={4} strokeLinecap="round" />
              <Line x1={100} y1={135} x2={125} y2={195} stroke={colors.primary} strokeWidth={4} strokeLinecap="round" />

              {/* 정확한 관절 점 (초록) */}
              <Circle cx={100} cy={43} r={6} fill={colors.primary} />
              <Circle cx={100} cy={75} r={5} fill={colors.primary} />
              <Circle cx={50} cy={105} r={6} fill={colors.primary} />
              <Circle cx={75} cy={195} r={6} fill={colors.primary} />
              <Circle cx={125} cy={195} r={6} fill={colors.primary} />

              {/* 교정 필요 관절 (정적 표시 — animate-pulse 제외) */}
              <Circle cx={150} cy={90} r={10} fill={colors.danger} opacity={0.4} />
              <Circle cx={150} cy={90} r={6} fill={colors.danger} />

              <SvgText x={25} y={125} fontSize={11} fontWeight="bold" fill={colors.primary} textAnchor="middle">
                ✓ 우측 완벽
              </SvgText>

              <Line
                x1={150}
                y1={90}
                x2={175}
                y2={115}
                stroke={colors.danger}
                strokeWidth={1.5}
                strokeDasharray="3,3"
              />
              <Circle cx={175} cy={115} r={3} fill={colors.danger} />
            </Svg>

            {/* 콜아웃 버블 (정적 — animate-bounce 제외) */}
            <View style={styles.calloutBubble}>
              <Text style={styles.calloutText}>⚠️ 왼쪽 팔꿈치를 딱 5cm만 더 들어올리세요!</Text>
            </View>
          </View>
        </View>

        {/* Action Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>오늘의 최종 점수</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{SCORE}</Text>
            <Text style={styles.scorePercent}>%</Text>
          </View>

          <View style={styles.scoreTrack}>
            <LinearGradient
              colors={[colors.scoreGradientStart, colors.scoreGradientMid, colors.scoreGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.scoreFill, { width: `${SCORE}%` }]}
            />
          </View>

          <View style={styles.scoreEvalBox}>
            <CheckCircle2 size={20} color={colors.primary} />
            <View style={styles.scoreEvalTextArea}>
              <Text style={styles.scoreEvalTitle}>아주 훌륭한 건강 유연성입니다!</Text>
              <Text style={styles.scoreEvalDescription}>
                조금만 수정하면 100점 만점에 가까워져요. 이대로만 계속하시면 치매 예방 점수가 더욱 상승합니다!
              </Text>
            </View>
          </View>
        </View>

        {/* Dynamic Fruit Reward Card */}
        <LinearGradient
          colors={[colors.amberBackground, colors.amberGradientEnd]}
          style={styles.rewardCard}
        >
          <View style={styles.rewardIconBox}>
            <Text style={styles.rewardIconText}>🍎</Text>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardBadgeText}>+1</Text>
            </View>
          </View>
          <View style={styles.rewardTextArea}>
            <View style={styles.rewardTitleRow}>
              <Sparkles size={18} color={colors.amberFill} fill={colors.amberFill} />
              <Text style={styles.rewardTitle}>건강 열매 1개 수확 성공!</Text>
            </View>
            <Text style={styles.rewardDescription}>
              운동이 기록에 반영되어 어르신의 건강 나무에 열매가 새로 열렸습니다.
            </Text>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Primary Confirm Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.confirmButtonText}>열매 챙겨서 나무 보러가기</Text>
          <Text style={styles.confirmButtonArrow}>➔</Text>
        </Pressable>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md + spacing.xs,
  },
  diagramCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.md + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  diagramBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoftBackground,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  diagramBadgeText: {
    fontSize: 14,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  diagramSvgWrap: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1 / 1.1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  calloutBubble: {
    position: 'absolute',
    top: 85,
    right: -8,
    maxWidth: 130,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.dangerBorderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  calloutText: {
    fontSize: 12,
    fontWeight: fontWeights.black,
    color: colors.white,
    lineHeight: 16,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: fontWeights.black,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  scorePercent: {
    fontSize: 24,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  scoreTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.grayBadgeBackground,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 5,
  },
  scoreEvalBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.emeraldSoftBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  scoreEvalTextArea: {
    flex: 1,
  },
  scoreEvalTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  scoreEvalDescription: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 26,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.amberCardBorder,
    padding: spacing.md + spacing.xs,
  },
  rewardIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.amberFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconText: {
    fontSize: 30,
  },
  rewardBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  rewardTextArea: {
    flex: 1,
  },
  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardTitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.amberTextDeep,
  },
  rewardDescription: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.amberText,
    marginTop: spacing.xs,
    lineHeight: 26,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confirmButton: {
    minHeight: MIN_TOUCH_TARGET,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  confirmButtonArrow: {
    fontSize: 18,
    color: colors.white,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
});
