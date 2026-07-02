import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../theme/theme';

interface BigButtonProps {
  label: string;
  subLabel?: string;
  icon?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
}

export default function BigButton({
  label,
  subLabel,
  icon,
  onPress,
  variant = 'primary',
  style,
}: BigButtonProps) {
  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
      ? colors.secondary
      : colors.white;
  const textColor = variant === 'outline' ? colors.text : colors.white;
  const borderStyle = variant === 'outline' ? { borderWidth: 3, borderColor: colors.primary } : {};

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        borderStyle,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        {subLabel ? (
          <Text style={[styles.subLabel, { color: textColor }]}>{subLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET + 24,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSizes.button,
    fontWeight: '700',
    textAlign: 'center',
  },
  subLabel: {
    fontSize: fontSizes.body,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
  },
});