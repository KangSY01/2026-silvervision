import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, HeartPulse, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

const ACTIVITY_LEVELS: ActivityLevel[] = ['독립', '부분 보조', '완전 보조'];

const ACTIVITY_LEVEL_HINTS: Record<ActivityLevel, string> = {
  독립: '💡 혼자 힘으로 자유로운 보행과 모든 실내외 활동이 가능한 상태입니다.',
  '부분 보조': '💡 기팡이나 보행 보조기가 필요하거나, 일어설 때 약간의 가이드가 필요한 상태입니다.',
  '완전 보조': '💡 이동 및 일어서기 동작에 보호자의 직접적인 신체적 보조가 필수적인 상태입니다.',
};

export default function SignupScreen() {
  const navigation = useNavigation();
  const { setUserProfile } = useAppState();
  const [name, setName] = useState('김순자');
  const [id, setId] = useState('silver99');
  const [pw, setPw] = useState('1234');
  const [phone, setPhone] = useState('010-1234-5678');
  const [address, setAddress] = useState('서울시 종로구 세종대로 123');
  const [diseases, setDiseases] = useState('고혈압, 무릎 골관절염');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('독립');
  const [medication, setMedication] = useState('혈압약 (아침식후 1정)');

  const handleBack = () => {
    navigation.goBack();
  };

  const handleRegister = () => {
    if (!name.trim() || !id.trim() || !pw.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('', '필수 인적 사항(성함, 아이디, 비밀번호, 연락처, 주소)을 모두 채워주세요.');
      return;
    }

    const profile: UserProfile = {
      name,
      id,
      pw,
      phone,
      address,
      diseases,
      activityLevel,
      medication,
    };

    setUserProfile(profile);
    navigation.navigate('SeniorHome');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>로그인화면</Text>
        </Pressable>

        <Text style={styles.title}>피보호자 회원가입</Text>
        <Text style={styles.subtitle}>
          안전하고 세심한 지도를 위해 인적사항과 거동 여부를 입력해 주세요.
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
          <Text style={styles.label}>
            어르신 성함 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="예: 김순자"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
          />
        </View>

        {/* ID Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            사용할 아이디 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={id}
            onChangeText={setId}
            placeholder="예: silver99"
            placeholderTextColor={colors.disabledText}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        {/* Password Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            비밀번호 (숫자 4자리) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={pw}
            onChangeText={setPw}
            placeholder="예: 1234"
            placeholderTextColor={colors.disabledText}
            secureTextEntry
            maxLength={4}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        {/* Phone Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            연락처 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="예: 010-1234-5678"
            placeholderTextColor={colors.disabledText}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        {/* Address Field */}
        <View style={styles.field}>
          <Text style={styles.label}>
            사시는 곳 주소 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="예: 서울시 종로구 세종대로 123"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
          />
        </View>

        {/* Mobility level - 3 Buttons Selector */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <HeartPulse size={20} color={colors.primary} />
            <Text style={styles.label}>
              거동 수준 선택 <Text style={styles.required}>*</Text>
            </Text>
          </View>

          <View style={styles.activityRow}>
            {ACTIVITY_LEVELS.map((level) => {
              const isActive = activityLevel === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setActivityLevel(level)}
                  style={({ pressed }) => [
                    styles.activityButton,
                    isActive && styles.activityButtonActive,
                    pressed && !isActive && styles.activityButtonPressed,
                  ]}
                >
                  {isActive && <Check size={16} color={colors.white} strokeWidth={3} />}
                  <Text
                    style={[
                      styles.activityButtonText,
                      isActive && styles.activityButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.activityHint}>
            <Text style={styles.activityHintText}>{ACTIVITY_LEVEL_HINTS[activityLevel]}</Text>
          </View>
        </View>

        {/* Diseases Field */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <ShieldAlert size={20} color={colors.danger} />
            <Text style={styles.label}>보유 중인 질환 (선택)</Text>
          </View>
          <TextInput
            value={diseases}
            onChangeText={setDiseases}
            placeholder="예: 고혈압, 무릎 관절염 등"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
          />
        </View>

        {/* Medication Field */}
        <View style={styles.field}>
          <Text style={styles.label}>매일 복용 중인 약 (선택)</Text>
          <TextInput
            value={medication}
            onChangeText={setMedication}
            placeholder="예: 혈압약 (아침식후 1정)"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
          />
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleRegister}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.submitButtonText}>회원가입 완료하기</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  required: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.danger,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  activityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activityButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  activityButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  activityButtonPressed: {
    borderColor: colors.primary,
  },
  activityButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  activityButtonTextActive: {
    color: colors.white,
  },
  activityHint: {
    backgroundColor: colors.primarySoftBackground,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  activityHintText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  submitButton: {
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
  submitButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
