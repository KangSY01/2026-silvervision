import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  SPECIAL_SETTING_DESCRIPTIONS,
  SPECIAL_SETTING_LABELS,
  SPECIAL_SETTING_ORDER,
  useAppMode,
} from '../context/AppModeContext';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../theme/theme';

// 특수환경 설정 창. TabScreenLayout의 개인정보 탭을 길게 누르면 열린다.
//  1) 암호 입력 → 2) 설정 항목 ON/OFF 토글.
// 암호는 보안 장치가 아니라 시니어가 실수로 설정을 바꾸는 것을 막는 문턱일 뿐이다
// (클라이언트 코드에 그대로 들어 있다). 서버 권한이나 개인정보와는 무관하다.

export const SPECIAL_MODE_LONG_PRESS_MS = 6_000;
const SPECIAL_MODE_PASSWORD = 'silvervision';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SpecialModeDialog({ visible, onClose }: Props) {
  const { settings, setSetting } = useAppMode();
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  // 닫을 때마다 초기화해 다음에 열면 다시 암호부터 묻는다.
  useEffect(() => {
    if (!visible) {
      setPassword('');
      setUnlocked(false);
      setError(false);
    }
  }, [visible]);

  const handleSubmitPassword = () => {
    if (password === SPECIAL_MODE_PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>특수환경</Text>

          {!unlocked ? (
            <>
              <Text style={styles.description}>암호를 입력하세요</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(false);
                }}
                onSubmitEditing={handleSubmitPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
              />
              {error && <Text style={styles.errorText}>암호가 맞지 않습니다</Text>}
              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.pressed]}
                >
                  <Text style={styles.buttonSecondaryText}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitPassword}
                  style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
                >
                  <Text style={styles.buttonPrimaryText}>확인</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {SPECIAL_SETTING_ORDER.map((key) => (
                <View key={key} style={styles.settingRow}>
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>{SPECIAL_SETTING_LABELS[key]}</Text>
                    <Text style={styles.settingDescription}>
                      {SPECIAL_SETTING_DESCRIPTIONS[key]}
                    </Text>
                  </View>
                  <Switch
                    value={settings[key]}
                    onValueChange={(value) => setSetting(key, value)}
                    trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
                    thumbColor={settings[key] ? colors.primary : colors.white}
                  />
                </View>
              ))}
              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
                >
                  <Text style={styles.buttonPrimaryText}>닫기</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  description: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.body,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 96,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  buttonSecondaryText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  settingRow: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  settingDescription: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
