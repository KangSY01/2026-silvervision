import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianProfile'>;

export default function GuardianProfileScreen({ navigation }: Props) {
  const { currentGuardian } = useAuth();
  const [name, setName] = useState(currentGuardian?.name ?? '');
  const [phone, setPhone] = useState(currentGuardian?.phone ?? '');

  const handleSave = () => {
    Alert.alert('저장 완료', '개인정보가 저장되었습니다.');
  };

  return (
    <ScreenContainer scroll>
      <BackHeader title="개인정보" onBack={() => navigation.goBack()} />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>성함</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>아이디</Text>
        <TextInput style={styles.input} value={currentGuardian?.id ?? ''} editable={false} />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>연락처</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} />
      </View>

      <BigButton label="저장하기" onPress={handleSave} variant="primary" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
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
});