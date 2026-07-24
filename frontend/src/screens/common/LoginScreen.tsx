import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Info, KeyRound, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  apiClient,
  getApiErrorMessage,
  LoginTokenResponse,
  persistSessionFromLoginResponse,
  SeniorProfileResponse,
} from '../../api/client';
import { useAppState } from '../../context/AppStateContext';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';
import { ActivityLevel, UserProfile } from '../../types';

// SeniorProfileResponse.mobility_level(백엔드 enum) -> ActivityLevel(화면 표시용 한글 라벨)
const MOBILITY_LEVEL_TO_ACTIVITY_LEVEL: Record<
  SeniorProfileResponse['mobility_level'],
  ActivityLevel
> = {
  independent: '독립',
  partial_assist: '부분 보조',
  full_assist: '완전 보조',
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const { setUserProfile } = useAppState();
  const [id, setId] = useState('silver99');
  const [pw, setPw] = useState('1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [idFocused, setIdFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogin = async () => {
    if (!id.trim() || !pw.trim()) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const tokens = await apiClient.post<LoginTokenResponse>(
        '/auth/senior/login/',
        { login_id: id, password: pw },
        { auth: false },
      );
      const session = await persistSessionFromLoginResponse(tokens);
      const profileResponse = await apiClient.get<SeniorProfileResponse>(
        `/senior/${session.userId}/`,
      );

      const profile: UserProfile = {
        id: profileResponse.login_id,
        name: profileResponse.name,
        phone: profileResponse.phone,
        address: profileResponse.address,
        diseases: profileResponse.diseases,
        medication: profileResponse.medication,
        activityLevel: MOBILITY_LEVEL_TO_ACTIVITY_LEVEL[profileResponse.mobility_level],
        // 백엔드 응답에는 비밀번호가 없으므로(SeniorProfileSerializer에 password 필드
        // 자체가 없음) 로그인 폼에 입력한 값을 그대로 보관한다 - 기존 목업 동작과 동일.
        pw,
      };

      setUserProfile(profile);
      navigation.navigate('SeniorHome');
    } catch (err) {
      setError(getApiErrorMessage(err, '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('Signup');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>이전화면</Text>
        </Pressable>

        <Text style={styles.title}>피보호자 로그인</Text>
        <Text style={styles.subtitle}>어르신의 아이디와 비밀번호를 입력해 주세요.</Text>
      </View>

      {/* Login Form */}
      <View style={styles.form}>
        <View style={styles.field}>
          <View style={styles.label}>
            <User size={20} color={colors.primary} />
            <Text style={styles.labelText}>아이디 (영어/숫자)</Text>
          </View>
          <TextInput
            value={id}
            onChangeText={(text) => {
              setId(text);
              setError('');
            }}
            onFocus={() => setIdFocused(true)}
            onBlur={() => setIdFocused(false)}
            placeholder="예: silver99"
            placeholderTextColor={colors.disabledText}
            autoCapitalize="none"
            style={[styles.input, idFocused && styles.inputFocused]}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.label}>
            <KeyRound size={20} color={colors.primary} />
            <Text style={styles.labelText}>비밀번호 (숫자 4자리)</Text>
          </View>
          <TextInput
            value={pw}
            onChangeText={(text) => {
              setPw(text);
              setError('');
            }}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
            placeholder="예: 1234"
            placeholderTextColor={colors.disabledText}
            secureTextEntry
            style={[styles.input, pwFocused && styles.inputFocused]}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Info size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {/* Buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressedPrimary,
            loading && styles.primaryButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>{loading ? '로그인 중...' : '로그인 하기'}</Text>
        </Pressable>

        <Pressable
          onPress={handleSignUp}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedSecondary]}
        >
          <Text style={styles.secondaryButtonText}>처음 오셨나요? (회원가입)</Text>
        </Pressable>

        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.linkButtonText}>처음으로 돌아가기</Text>
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
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  labelText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.body,
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
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  linkButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  linkButtonText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
  pressedSecondary: {
    borderColor: colors.primary,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
