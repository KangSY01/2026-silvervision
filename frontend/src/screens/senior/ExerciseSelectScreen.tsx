import { useNavigation } from '@react-navigation/native';
import { Mic, Play, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TabScreenLayout from '../../components/TabScreenLayout';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';
import { Workout } from '../../types';

const WORKOUTS: Workout[] = [
  {
    id: 'stretch',
    name: '관절 스트레칭',
    difficulty: '쉬움',
    duration: '3분',
    iconName: '🧘',
    description: '앉은 자세에서 목, 어깨, 손목을 천천히 돌려 굳은 관절을 부드럽게 풀어줍니다.',
  },
  {
    id: 'upper',
    name: '어깨 상체 운동',
    difficulty: '보통',
    duration: '5분',
    iconName: '💪',
    description: '양팔을 천천히 들어올리며 어깨와 팔 근육을 골고루 사용해 상체 힘을 길러줍니다.',
  },
  {
    id: 'knee',
    name: '무릎 관절 강화 운동',
    difficulty: '쉬움',
    duration: '4분',
    iconName: '🦵',
    description:
      '안전한 의자에 바르게 앉아 다리를 가볍게 쭉 펴주며 무릎 연골 주변 허벅지 근육을 채웁니다.',
  },
  {
    id: 'balance',
    name: '낙상 예방 균형 운동',
    difficulty: '보통',
    duration: '5분',
    iconName: '⚖️',
    description: '한 발로 가볍게 서는 동작을 반복하며 균형 감각을 키워 낙상을 예방합니다.',
  },
];

export default function ExerciseSelectScreen() {
  const navigation = useNavigation();

  const handleOpenVoiceAssistant = () => {
    // TODO: 음성 인식 기능 설계 확정 후 연결 (AGENTS.md 5장 참고) — VoiceAssistantModal은 아직 마운트하지 않음
    console.log('[ExerciseSelectScreen] open voice assistant');
  };

  const handleSelectWorkout = (workout: Workout) => {
    navigation.navigate('ExerciseProgress', { workout });
  };

  return (
    <TabScreenLayout activeTab="workout">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>추천 치매 예방 운동</Text>

          <Pressable
            onPress={handleOpenVoiceAssistant}
            style={({ pressed }) => [styles.micButton, pressed && styles.pressedPrimary]}
          >
            <Mic size={24} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.micButtonLabel}>말로찾기</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>무리가 가지 않는 동작들로 매일 꾸준히 실천해 보세요.</Text>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.helperGuide}>
          <Sparkles size={20} color={colors.amberFill} fill={colors.amberFill} />
          <Text style={styles.helperGuideText}>아래에서 하고 싶은 운동 카드를 눌러주세요!</Text>
        </View>

        {WORKOUTS.map((workout) => {
          const isEasy = workout.difficulty === '쉬움';
          return (
            <Pressable
              key={workout.id}
              onPress={() => handleSelectWorkout(workout)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardLeft}>
                  <View style={styles.iconBox}>
                    <Text style={styles.iconText}>{workout.iconName}</Text>
                  </View>
                  <View style={styles.cardTitleArea}>
                    <Text style={styles.cardTitle}>{workout.name}</Text>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: isEasy ? colors.primarySoftBackground : colors.amberSoftBackground },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: isEasy ? colors.primary : colors.amberText }]}
                        >
                          난이도: {workout.difficulty}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: colors.grayBadgeBackground }]}>
                        <Text style={[styles.badgeText, { color: colors.disabledText }]}>
                          시간: {workout.duration}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.playButton}>
                  <Play size={20} color={colors.primary} fill={colors.primary} />
                </View>
              </View>

              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>{workout.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  micButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  micButtonLabel: {
    fontSize: 10,
    fontWeight: fontWeights.black,
    color: colors.emeraldTextLight,
    marginTop: 2,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  helperGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoftBackground,
    borderWidth: 1,
    borderColor: colors.primarySoftBorderStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  helperGuideText: {
    flex: 1,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  card: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md + spacing.xs,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  cardPressed: {
    borderColor: colors.primary,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 30,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: fontWeights.black,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoftBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
  },
  descriptionText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
});
