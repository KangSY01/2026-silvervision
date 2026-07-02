import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { mockWards } from '../../data/mockData';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianHome'>;

export default function GuardianHomeScreen({ navigation }: Props) {
  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>피보호자 현황</Text>

      <View style={styles.list}>
        {mockWards.map((ward) => (
          <Pressable
            key={ward.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('ActivityRecord', { wardId: ward.id, wardName: ward.name })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{ward.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{ward.name}</Text>
              <Text style={styles.cardActivity}>오늘 활동량: {ward.todayActivityCount}회</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.bottomArea}>
        <BigButton
          label="개인정보"
          icon="👤"
          variant="outline"
          onPress={() => navigation.navigate('GuardianProfile')}
        />
        <BigButton
          label="피보호자 추가"
          icon="➕"
          variant="secondary"
          onPress={() => navigation.navigate('AddWard')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET + 24,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSizes.subtitle,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSizes.subtitle,
    fontWeight: '700',
    color: colors.text,
  },
  cardActivity: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  bottomArea: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});