import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ route, navigation }: Props) {
  const { userType } = route.params;
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    const success = login(id.trim(), password.trim());
    if (success) {
      navigation.reset({
        index: 0,
        routes: [{ name: userType === 'senior' ? 'SeniorHome' : 'GuardianHome' }],
      });
    } else {
      Alert.alert('로그인 실패', 'ID 또는 비밀번호를 다시 확인해주세요.');
    }
  };

  const handleSignUp = () => {
    Alert.alert('회원가입', '회원가입 기능은 준비 중입니다.');
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>
        {userType === 'senior' ? '피보호자 로그인' : '보호자 로그인'}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>아이디</Text>
        <TextInput
          style={styles.input}
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
          placeholder="아이디를 입력하세요"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="비밀번호를 입력하세요"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.buttonArea}>
        <BigButton label="로그인" onPress={handleLogin} variant="primary" />
        <BigButton label="회원가입" onPress={handleSignUp} variant="outline" />
      </View>

      {userType === 'senior' ? (
        <Text style={styles.hint}>테스트 계정: senior01 / 1234</Text>
      ) : (
        <Text style={styles.hint}>테스트 계정: guardian01 / 1234</Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  form: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.body,
    color: colors.text,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  buttonArea: {
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.lg,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});