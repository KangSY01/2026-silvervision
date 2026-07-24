import { useNavigation } from '@react-navigation/native';
import { Info, Mic, Play, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient, ExerciseResponse, getApiErrorMessage } from '../../api/client';
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

// ExerciseResponse.difficulty(백엔드 enum) -> Workout.difficulty(화면 표시용 한글 라벨).
// mobility_level 매핑과 같은 패턴 - Record 타입이라 백엔드 enum 값이 늘어나면
// 컴파일 타임에 누락이 드러난다.
const DIFFICULTY_LABELS: Record<ExerciseResponse['difficulty'], Workout['difficulty']> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

const DIFFICULTY_BADGE_COLORS: Record<Workout['difficulty'], { background: string; text: string }> = {
  쉬움: { background: colors.primarySoftBackground, text: colors.primary },
  보통: { background: colors.amberSoftBackground, text: colors.amberText },
  어려움: { background: colors.dangerBackground, text: colors.danger },
};

// 백엔드 Exercise 모델엔 아이콘 필드가 없다. category(자유 텍스트)를 기준으로
// 화면 표시용 이모지만 로컬에서 유추하고, 목록에 없는 category는 기본 아이콘으로
// 폴백한다 - 카드가 비어 보이지 않게 하기 위한 순수 프레젠테이션 로직이며
// Workout 타입 자체에는 저장하지 않는다(타입은 API 응답 형태를 그대로 반영).
const CATEGORY_ICONS: Record<string, string> = {
  스트레칭: '🧘',
  '상체 운동': '💪',
  '무릎 운동': '🦵',
  '균형 운동': '⚖️',
};
const DEFAULT_CATEGORY_ICON = '🏃';

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON;
}

function mapExerciseResponse(exercise: ExerciseResponse): Workout {
  return {
    id: exercise.exercise_id,
    name: exercise.name,
    category: exercise.category,
    difficulty: DIFFICULTY_LABELS[exercise.difficulty],
  };
}

export default function ExerciseSelectScreen() {
  const navigation = useNavigation();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExercises = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<ExerciseResponse[]>('/exercises/');
      setWorkouts(response.map(mapExerciseResponse));
    } catch (err) {
      setError(getApiErrorMessage(err, '운동 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {loading ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>운동 목록을 불러오는 중...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Info size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={loadExercises}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedOpacity]}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>등록된 운동이 아직 없습니다.</Text>
          </View>
        ) : (
          <>
            <View style={styles.helperGuide}>
              <Sparkles size={20} color={colors.amberFill} fill={colors.amberFill} />
              <Text style={styles.helperGuideText}>아래에서 하고 싶은 운동 카드를 눌러주세요!</Text>
            </View>

            {workouts.map((workout) => {
              const badgeColor = DIFFICULTY_BADGE_COLORS[workout.difficulty];
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => handleSelectWorkout(workout)}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardLeft}>
                      <View style={styles.iconBox}>
                        <Text style={styles.iconText}>{getCategoryIcon(workout.category)}</Text>
                      </View>
                      <View style={styles.cardTitleArea}>
                        <Text style={styles.cardTitle}>{workout.name}</Text>
                        <View style={styles.badgeRow}>
                          <View style={[styles.badge, { backgroundColor: badgeColor.background }]}>
                            <Text style={[styles.badgeText, { color: badgeColor.text }]}>
                              난이도: {workout.difficulty}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: colors.grayBadgeBackground }]}>
                            <Text style={[styles.badgeText, { color: colors.disabledText }]}>
                              {workout.category}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.playButton}>
                      <Play size={20} color={colors.primary} fill={colors.primary} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
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
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  statusText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  errorBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  errorText: {
    textAlign: 'center',
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.dangerBorder,
  },
  retryButtonText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.danger,
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
    marginBottom: spacing.md,
  },
  helperGuideText: {
    flex: 1,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.md + spacing.xs,
    marginBottom: spacing.md,
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
  pressedPrimary: {
    backgroundColor: '#256428',
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
