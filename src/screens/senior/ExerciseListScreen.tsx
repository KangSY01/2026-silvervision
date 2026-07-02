import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { mockExercises } from '../../data/mockData';
import { RootStackParamList } from '../../navigation/types';
import { fontSizes, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseList'>;

const ICONS: Record<string, string> = {
  stretching: '🤸',
  upper: '💪',
  knee: '🦵',
};

export default function ExerciseListScreen({ navigation }: Props) {
  const handleSelect = (title: string, description: string) => {
    Alert.alert(title, description);
  };

  return (
    <ScreenContainer>
      <BackHeader title="추천 운동" onBack={() => navigation.goBack()} />
      <Text style={styles.helper}>오늘 할 운동을 골라보세요</Text>
      <View style={styles.list}>
        {mockExercises.map((exercise) => (
          <BigButton
            key={exercise.id}
            label={exercise.title}
            subLabel={`${exercise.durationMinutes}분 · ${exercise.description}`}
            icon={ICONS[exercise.category]}
            variant="primary"
            onPress={() => handleSelect(exercise.title, exercise.description)}
            style={styles.card}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  helper: {
    fontSize: fontSizes.body,
    color: '#3D3D3D',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    minHeight: 140,
  },
});