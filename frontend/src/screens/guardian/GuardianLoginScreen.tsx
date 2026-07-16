import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Info, KeyRound, Shield, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppState } from '../../context/AppStateContext';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import { Guardian } from '../../types';

export default function GuardianLoginScreen() {
  const navigation = useNavigation();
  const { guardianProfile, setGuardianProfile } = useAppState();
  const [id, setId] = useState(guardianProfile.id || 'guardian1');
  const [pw, setPw] = useState(guardianProfile.pw || '1234');
  const [error, setError] = useState('');
  const [idFocused, setIdFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  const handleBack = () => {
    navigation.navigate('Entry');
  };

  const handleLogin = () => {
    if (!id.trim() || !pw.trim()) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    const activeGuardian: Guardian = {
      ...guardianProfile,
      id,
      pw,
    };

    setGuardianProfile(activeGuardian);
    navigation.navigate('GuardianHome');
  };

  const handleSignUp = () => {
    navigation.navigate('GuardianSignup');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>처음으로</Text>
        </Pressable>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Shield size={14} color={colors.primary} />
            <Text style={styles.badgeText}>보호자 전용</Text>
          </View>
        </View>

        <Text style={styles.title}>보호자 로그인</Text>
        <Text style={styles.subtitle}>
          어르신의 활동량 및 긴급 안전 모니터링을 위한 보호자 전용 계정으로 로그인해 주세요.
        </Text>
      </View>

      {/* Login Form */}
      <View style={styles.form}>
        <View style={styles.field}>
          <View style={styles.label}>
            <User size={16} color={colors.primary} />
            <Text style={styles.labelText}>아이디</Text>
          </View>
          <TextInput
            value={id}
            onChangeText={(text) => {
              setId(text);
              setError('');
            }}
            onFocus={() => setIdFocused(true)}
            onBlur={() => setIdFocused(false)}
            placeholder="아이디를 입력하세요"
            placeholderTextColor={colors.disabledText}
            autoCapitalize="none"
            style={[styles.input, idFocused && styles.inputFocused]}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.label}>
            <KeyRound size={16} color={colors.primary} />
            <Text style={styles.labelText}>비밀번호</Text>
          </View>
          <TextInput
            value={pw}
            onChangeText={(text) => {
              setPw(text);
              setError('');
            }}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor={colors.disabledText}
            secureTextEntry
            style={[styles.input, pwFocused && styles.inputFocused]}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Info size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {/* Buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleLogin}
          style={({ pressed }) => [pressed && styles.pressedScale]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>로그인</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handleSignUp}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedSecondary]}
        >
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </Pressable>

        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.linkButtonText}>← 처음으로 (피보호자/보호자 선택)</Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryTintBackground,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  title: {
    fontSize: guardianFontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: guardianFontSizes.subtitle,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  labelText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  input: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: guardianFontSizes.input,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: guardianFontSizes.error,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  actions: {
    gap: spacing.sm + spacing.xs,
  },
  primaryButton: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  secondaryButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  linkButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: {
    fontSize: guardianFontSizes.link,
    fontWeight: fontWeights.semibold,
    color: colors.disabledText,
  },
  pressedScale: {
    opacity: 0.95,
  },
  pressedSecondary: {
    borderColor: colors.primary,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
