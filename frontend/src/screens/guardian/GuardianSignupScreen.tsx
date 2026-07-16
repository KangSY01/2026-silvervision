import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Info, KeyRound, MapPin, Phone, Smile, User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

export default function GuardianSignupScreen() {
  const navigation = useNavigation();
  const { guardianProfile, setGuardianProfile } = useAppState();
  const [name, setName] = useState(guardianProfile.name || '박보호');
  const [id, setId] = useState(guardianProfile.id || 'guardian1');
  const [pw, setPw] = useState(guardianProfile.pw || '1234');
  const [phone, setPhone] = useState(guardianProfile.phone || '010-9999-1234');
  const [address, setAddress] = useState(
    guardianProfile.address || '서울시 마포구 독막로 45, 래미안아파트 101동 502호',
  );
  const [error, setError] = useState('');

  const handleBack = () => {
    navigation.navigate('GuardianLogin');
  };

  const handleSignup = () => {
    if (!name.trim() || !id.trim() || !pw.trim() || !phone.trim() || !address.trim()) {
      setError('모든 항목을 올바르게 채워 주세요.');
      return;
    }

    const updatedGuardian: Guardian = { name, id, pw, phone, address };

    setGuardianProfile(updatedGuardian);
    navigation.navigate('GuardianHome');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>로그인 화면으로</Text>
        </Pressable>
        <Text style={styles.title}>보호자 회원가입</Text>
        <Text style={styles.subtitle}>
          어르신의 안전 상태를 안전하게 전달받기 위한 정보를 기입해 주세요.
        </Text>
      </View>

      {/* Scrollable Form Area */}
      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Name Field */}
        <View style={styles.field}>
          <View style={styles.label}>
            <Smile size={16} color={colors.primary} />
            <Text style={styles.labelText}>보호자 성함</Text>
          </View>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            placeholder="예: 홍길동"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
          />
        </View>

        {/* ID Field */}
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
            placeholder="아이디를 정해주세요"
            placeholderTextColor={colors.disabledText}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        {/* Password Field */}
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
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor={colors.disabledText}
            secureTextEntry
            style={styles.input}
          />
        </View>

        {/* Phone Field */}
        <View style={styles.field}>
          <View style={styles.label}>
            <Phone size={16} color={colors.primary} />
            <Text style={styles.labelText}>보호자 연락처</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setError('');
            }}
            placeholder="예: 010-1234-5678"
            placeholderTextColor={colors.disabledText}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        {/* Address Field */}
        <View style={styles.field}>
          <View style={styles.label}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.labelText}>비상 거주지 주소</Text>
          </View>
          <TextInput
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setError('');
            }}
            placeholder="지번 또는 도로명 주소를 입력하세요"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Info size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Signup Action */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSignup}
          style={({ pressed }) => [pressed && styles.pressedScale]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>회원가입 완료</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
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
  },
  formContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.lg,
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
    fontSize: guardianFontSizes.labelSmall,
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
    fontSize: guardianFontSizes.inputSmall,
    fontWeight: fontWeights.medium,
    color: colors.text,
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
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  submitButton: {
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
  submitButtonText: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  pressedScale: {
    opacity: 0.95,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
