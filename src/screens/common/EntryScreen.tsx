import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Entry'>;

export default function EntryScreen({ navigation }: Props) {
  const { selectUserType } = useAuth();

  const handleSelect = (type: 'senior' | 'guardian') => {
    selectUserType(type);
    navigation.navigate('Login', { userType: type });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.appName}>실버비전</Text>
        <Text style={styles.subtitle}>누구로 시작할까요?</Text>
      </View>
      <View style={styles.buttonArea}>
        <BigButton
          label="피보호자"
          subLabel="어르신이 사용해요"
          icon="🧓"
          variant="primary"
          onPress={() => handleSelect('senior')}
          style={styles.bigTile}
        />
        <BigButton
          label="보호자"
          subLabel="가족/보호자가 사용해요"
          icon="👨‍👩‍👧"
          variant="secondary"
          onPress={() => handleSelect('guardian')}
          style={styles.bigTile}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  appName: {
    fontSize: fontSizes.title + 6,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSizes.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  buttonArea: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  bigTile: {
    minHeight: 180,
  },
});