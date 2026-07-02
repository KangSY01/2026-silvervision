import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SeniorHome'>;

export default function SeniorHomeScreen({ navigation }: Props) {
  const { currentSenior } = useAuth();
  const [listening, setListening] = useState(false);

  const handleMicPress = () => {
    setListening((prev) => !prev);
    Alert.alert('음성인식', '음성인식 기능은 준비 중입니다.');
  };

  return (
    <ScreenContainer>
      <View style={styles.rankRow}>
        <View style={styles.rankBox}>
          <Text style={styles.rankLabel}>전국 순위</Text>
          <Text style={styles.rankValue}>{currentSenior?.nationalRank ?? '-'}위</Text>
        </View>
        <View style={styles.rankBox}>
          <Text style={styles.rankLabel}>지역 순위</Text>
          <Text style={styles.rankValue}>{currentSenior?.regionRank ?? '-'}위</Text>
        </View>
      </View>

      <View style={styles.treeArea}>
        <Text style={styles.treeEmoji}>🌳</Text>
        <View style={styles.fruitBadge}>
          <Text style={styles.fruitText}>🍎 열매 {currentSenior?.fruitCount ?? 0}개</Text>
        </View>
        <Text style={styles.greeting}>{currentSenior?.name ?? '어르신'}님, 오늘도 화이팅!</Text>
      </View>

      <View style={styles.bottomRow}>
        <Pressable
          style={styles.sideButton}
          onPress={() => navigation.navigate('ExerciseList')}
        >
          <Text style={styles.sideIcon}>🏃</Text>
          <Text style={styles.sideLabel}>추천 운동</Text>
        </Pressable>

        <Pressable
          style={[styles.micButton, listening && styles.micButtonActive]}
          onPress={handleMicPress}
          accessibilityLabel="음성으로 실버비전 사용하기"
        >
          <Text style={styles.micIcon}>🎤</Text>
        </Pressable>

        <Pressable
          style={styles.sideButton}
          onPress={() => navigation.navigate('SeniorProfile')}
        >
          <Text style={styles.sideIcon}>👤</Text>
          <Text style={styles.sideLabel}>개인정보</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  rankRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rankBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  rankLabel: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rankValue: {
    fontSize: fontSizes.subtitle,
    color: colors.primary,
    fontWeight: '800',
    marginTop: spacing.xs / 2,
  },
  treeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeEmoji: {
    fontSize: 140,
  },
  fruitBadge: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  fruitText: {
    fontSize: fontSizes.subtitle,
    fontWeight: '700',
    color: colors.text,
  },
  greeting: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  sideButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET + 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
  },
  sideIcon: {
    fontSize: 30,
  },
  sideLabel: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs / 2,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  micButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  micIcon: {
    fontSize: 44,
  },
});