import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import BigButton from '../../components/BigButton';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, MIN_TOUCH_TARGET, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SeniorProfile'>;

const BARCODE_WIDTHS = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1];

function FormField({
  label,
  value,
  onChangeText,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

export default function SeniorProfileScreen({ navigation }: Props) {
  const { currentSenior, updateSeniorProfile } = useAuth();

  const [name, setName] = useState(currentSenior?.name ?? '');
  const [password, setPassword] = useState(currentSenior?.password ?? '');
  const [phone, setPhone] = useState(currentSenior?.phone ?? '');
  const [address, setAddress] = useState(currentSenior?.address ?? '');
  const [conditions, setConditions] = useState(currentSenior?.conditions ?? '');
  const [mobilityLevel, setMobilityLevel] = useState(currentSenior?.mobilityLevel ?? '');
  const [medications, setMedications] = useState(currentSenior?.medications ?? '');

  const handleSave = () => {
    updateSeniorProfile({
      name,
      password,
      phone,
      address,
      conditions,
      mobilityLevel,
      medications,
    });
    Alert.alert('저장 완료', '개인정보가 저장되었습니다.');
  };

  return (
    <ScreenContainer scroll>
      <BackHeader title="개인정보" onBack={() => navigation.goBack()} />

      <FormField label="성함" value={name} onChangeText={setName} />
      <FormField label="아이디" value={currentSenior?.id ?? ''} onChangeText={() => {}} />
      <FormField label="비밀번호" value={password} onChangeText={setPassword} secure />
      <FormField label="연락처" value={phone} onChangeText={setPhone} />
      <FormField label="주소" value={address} onChangeText={setAddress} />
      <FormField label="질환" value={conditions} onChangeText={setConditions} />
      <FormField label="거동 수준" value={mobilityLevel} onChangeText={setMobilityLevel} />
      <FormField label="복용약" value={medications} onChangeText={setMedications} />

      <BigButton label="저장하기" onPress={handleSave} variant="primary" />

      <View style={styles.barcodeArea}>
        <Text style={styles.barcodeTitle}>개인 바코드</Text>
        <View style={styles.barcodeRow}>
          {BARCODE_WIDTHS.map((w, i) => (
            <View
              key={i}
              style={{
                width: w * 3,
                height: 70,
                backgroundColor: i % 2 === 0 ? colors.text : colors.background,
                marginRight: 1,
              }}
            />
          ))}
        </View>
        <Text style={styles.barcodeNumber}>{currentSenior?.id ?? ''}</Text>
      </View>
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
  barcodeArea: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  barcodeTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  barcodeRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    padding: spacing.sm,
  },
  barcodeNumber: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
});