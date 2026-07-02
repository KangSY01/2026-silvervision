import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, MIN_TOUCH_TARGET, spacing } from '../theme/theme';

interface BackHeaderProps {
  title: string;
  onBack: () => void;
}

export default function BackHeader({ title, onBack }: BackHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        style={styles.backButton}
        accessibilityLabel="뒤로 가기"
        hitSlop={12}
      >
        <Text style={styles.backText}>← 뒤로</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET + 20,
    justifyContent: 'center',
  },
  backText: {
    fontSize: fontSizes.body,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    flex: 1,
    fontSize: fontSizes.title - 2,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  spacer: {
    minWidth: MIN_TOUCH_TARGET + 20,
  },
});