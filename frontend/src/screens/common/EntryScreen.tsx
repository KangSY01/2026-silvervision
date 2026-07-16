import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Shield, User } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';

export default function EntryScreen() {
  const navigation = useNavigation();

  const handleSelectSenior = () => {
    navigation.navigate('Login');
  };

  const handleSelectGuardian = () => {
    navigation.navigate('GuardianLogin');
  };

  return (
    <View style={styles.container}>
      <View />

      <View style={styles.brand}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.logo}
        >
          <Heart size={56} color={colors.white} fill={colors.white} />
        </LinearGradient>

        <Text style={styles.brandName}>실버비전</Text>
        <Text style={styles.brandSubtitle}>
          노년을 위한{'\n'}든든한 운동 친구
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleSelectSenior}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <View style={styles.buttonLeft}>
              <User size={28} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>
                피보호자{' '}
                <Text style={styles.primaryButtonSubLabel}>(시니어)</Text>
              </Text>
            </View>
            <Text style={styles.arrow}>➔</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handleSelectGuardian}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <View style={styles.buttonLeft}>
              <Shield size={28} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>
                보호자{' '}
                <Text style={styles.primaryButtonSubLabel}>(조회용)</Text>
              </Text>
            </View>
            <Text style={styles.arrow}>➔</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  brand: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontSize: fontSizes.brand,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 280,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    height: 64,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  primaryButtonSubLabel: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    color: colors.white,
    opacity: 0.9,
  },
  arrow: {
    fontSize: 24,
    color: colors.white,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
