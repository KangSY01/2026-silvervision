import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddWard'>;

export default function AddWardScreen({ navigation }: Props) {
  const [wardId, setWardId] = useState('');

  const handleRegister = () => {
    if (!wardId.trim()) {
      Alert.alert('알림', '피보호자 아이디를 입력해주세요.');
      return;
    }
    Alert.alert('등록 완료', `${wardId} 님이 피보호자로 등록되었습니다.`, [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  };

  const handleBarcodeRegister = () => {
    Alert.alert('바코드 등록', '카메라로 피보호자의 개인 바코드를 스캔합니다. (준비 중)');
  };

  return (
    <ScreenContainer>
      <BackHeader title="피보호자 추가" onBack={() => navigation.goBack()} />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>피보호자 아이디</Text>
        <TextInput
          style={styles.input}
          value={wardId}
          onChangeText={setWardId}
          autoCapitalize="none"
          placeholder="아이디를 입력하세요"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <BigButton label="아이디로 등록하기" onPress={handleRegister} variant="primary" />

      <Text style={styles.orText}>또는</Text>

      <BigButton
        label="바코드로 등록하기"
        icon="📷"
        onPress={handleBarcodeRegister}
        variant="secondary"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  orText: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
    fontWeight: '600',
  },
});