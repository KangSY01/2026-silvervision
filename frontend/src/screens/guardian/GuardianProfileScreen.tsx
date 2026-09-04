import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ShieldCheck, UserMinus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  apiClient,
  getApiErrorMessage,
  getSession,
  GuardianProfileResponse,
  GuardianSeniorMapResponse,
} from '../../api/client';
import GuardianTabScreenLayout from '../../components/GuardianTabScreenLayout';
import { useAppState } from '../../context/AppStateContext';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';

type LoadState = 'loading' | 'ready' | 'error';
type EditableField = 'name' | 'phone' | 'address';

const FIELD_LABEL: Record<EditableField, string> = {
  name: '성함',
  phone: '비상 연락처',
  address: '비상 이송/거주지 주소',
};

export default function GuardianProfileScreen() {
  const navigation = useNavigation();
  const { guardianProfile, setGuardianProfile } = useAppState();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [profile, setProfile] = useState<GuardianProfileResponse | null>(null);
  const [mappings, setMappings] = useState<GuardianSeniorMapResponse[]>([]);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // 진입/복귀마다 재조회(다른 가디언 화면과 동일 패턴). 최초만 'loading'을
  // 노출하고 이후 포커스 재조회는 기존 화면을 둔 채 조용히 갱신한다.
  const load = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const [profileRes, mappingRes] = await Promise.all([
        apiClient.get<GuardianProfileResponse>(`/guardian/${session.userId}/`),
        apiClient.get<GuardianSeniorMapResponse[]>(`/guardian/${session.userId}/seniors/`),
      ]);
      setProfile(profileRes);
      setMappings(mappingRes);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        // 화면을 떠나면 편집 상태는 버린다.
        setEditingField(null);
        setDraft('');
      };
    }, [load]),
  );

  const startEdit = (field: EditableField) => {
    setEditingField(field);
    setDraft(profile?.[field] ?? '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraft('');
  };

  const saveEdit = async () => {
    if (!editingField || !profile) return;
    const value = draft.trim();
    if (!value) {
      Alert.alert('입력 오류', `${FIELD_LABEL[editingField]}을(를) 입력해 주세요.`);
      return;
    }
    if (value === profile[editingField]) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      const session = await getSession();
      if (!session) {
        Alert.alert('세션 만료', '다시 로그인해 주세요.');
        return;
      }
      const updated = await apiClient.patch<GuardianProfileResponse>(
        `/guardian/${session.userId}/`,
        { [editingField]: value },
      );
      setProfile(updated);
      // GuardianHomeScreen 등이 읽는 공용 상태도 함께 갱신(성함 변경 등 반영).
      setGuardianProfile({ ...guardianProfile, [editingField]: updated[editingField] });
      setEditingField(null);
      setDraft('');
    } catch (err) {
      Alert.alert('수정 실패', getApiErrorMessage(err, '잠시 후 다시 시도해 주세요.'));
    } finally {
      setSaving(false);
    }
  };

  const doUnlink = async (seniorId: number) => {
    try {
      const session = await getSession();
      if (!session) {
        Alert.alert('세션 만료', '다시 로그인해 주세요.');
        return;
      }
      await apiClient.delete<void>(`/guardian/${session.userId}/seniors/${seniorId}/`);
      setMappings((prev) => prev.filter((m) => m.senior.senior_id !== seniorId));
    } catch (err) {
      Alert.alert('연동 해제 실패', getApiErrorMessage(err, '잠시 후 다시 시도해 주세요.'));
    }
  };

  const handleUnlinkSenior = (mapping: GuardianSeniorMapResponse) => {
    Alert.alert(
      '연동 해제',
      `${mapping.senior.name} 어르신과의 연동을 해제하시겠습니까?\n` +
        '해제하면 이 어르신의 활동·안전 정보를 더 이상 볼 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '연동 해제',
          style: 'destructive',
          onPress: () => void doUnlink(mapping.senior.senior_id),
        },
      ],
    );
  };

  const handleGoHome = () => {
    navigation.navigate('GuardianHome');
  };

  const renderEditableRow = (field: EditableField, last?: boolean) => {
    const editing = editingField === field;
    if (editing) {
      return (
        <View style={[styles.row, last && styles.rowLast, styles.rowEditing]}>
          <View style={styles.editWrap}>
            <Text style={styles.rowLabel}>{FIELD_LABEL[field]}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              style={[styles.editInput, field === 'address' && styles.editInputMultiline]}
              multiline={field === 'address'}
              autoFocus
              editable={!saving}
              keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
              placeholder={`${FIELD_LABEL[field]} 입력`}
              placeholderTextColor={colors.disabledText}
            />
            <View style={styles.editActions}>
              <Pressable
                onPress={cancelEdit}
                disabled={saving}
                style={({ pressed }) => [styles.editCancelBtn, pressed && styles.pressedOpacity]}
              >
                <Text style={styles.editCancelText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveEdit()}
                disabled={saving}
                style={({ pressed }) => [
                  styles.editSaveBtn,
                  pressed && styles.pressedOpacity,
                  saving && styles.editSaveBtnDisabled,
                ]}
              >
                <Text style={styles.editSaveText}>{saving ? '저장 중...' : '저장'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.row, last && styles.rowLast]}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel}>{FIELD_LABEL[field]}</Text>
          <Text style={field === 'address' ? styles.rowValueSmall : styles.rowValue}>
            {profile?.[field] || '정보 없음'}
          </Text>
        </View>
        <Pressable
          onPress={() => startEdit(field)}
          style={({ pressed }) => [styles.editLinkHit, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.editLink}>수정</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <GuardianTabScreenLayout activeTab="profile">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>보호자 개인정보</Text>
          <Text style={styles.subtitle}>
            긴급 상황 시 비상연락 및 정보 관리를 위한 프로필 카드입니다.
          </Text>
        </View>

        {loadState === 'loading' ? (
          <Text style={styles.stateText}>개인정보를 불러오는 중...</Text>
        ) : loadState === 'error' || !profile ? (
          <Text style={styles.stateText}>
            개인정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </Text>
        ) : (
          <>
            {/* Personal Details Card */}
            <View style={styles.card}>
              {renderEditableRow('name')}

              <View style={[styles.row, styles.rowMuted]}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>로그인 아이디</Text>
                  <Text style={styles.rowValueMuted}>{profile.login_id}</Text>
                </View>
                <Text style={styles.rowNoEdit}>수정 불가</Text>
              </View>

              {/* 비밀번호 변경 API는 범위 밖(토큰 refresh/로그아웃 배치에서 확정).
                  행 자체는 남겨 "비밀번호가 설정돼 있음"을 보이고, 우측만 준비 중 표기 -
                  로그인 아이디 행과 같은 "비편집 행" 패턴이라 카드가 어색해지지 않는다. */}
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>비밀번호</Text>
                  <Text style={styles.rowValue}>••••</Text>
                </View>
                <Text style={styles.rowNoEdit}>준비 중</Text>
              </View>

              {renderEditableRow('phone')}
              {renderEditableRow('address', true)}
            </View>

            {/* Linked Seniors Management */}
            <View style={styles.seniorSection}>
              <Text style={styles.sectionHeading}>등록된 안심 피보호자 목록</Text>

              {mappings.length > 0 ? (
                <View style={styles.seniorList}>
                  {mappings.map((mapping) => (
                    <View key={mapping.map_id} style={styles.seniorRow}>
                      <View style={styles.seniorRowLeft}>
                        <View style={styles.seniorAvatar}>
                          <Text style={styles.seniorAvatarText}>
                            {mapping.senior.name.slice(-2)}
                          </Text>
                        </View>
                        <View style={styles.seniorTextWrap}>
                          <Text style={styles.seniorName}>{mapping.senior.name} 어르신</Text>
                          <Text style={styles.seniorId}>아이디: {mapping.senior.login_id}</Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleUnlinkSenior(mapping)}
                        style={({ pressed }) => [
                          styles.unlinkButton,
                          pressed && styles.unlinkButtonPressed,
                        ]}
                      >
                        <UserMinus size={14} color={colors.danger} />
                        <Text style={styles.unlinkButtonText}>연동 해제</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySeniorBox}>
                  <Text style={styles.emptySeniorText}>
                    아직 등록 완료된 피보호자 어르신 정보가 없습니다.{'\n'}홈 화면 하단에서 추가 등록을
                    진행해 주세요.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Safety Badge */}
        <View style={styles.safetyBadge}>
          <ShieldCheck size={26} color={colors.primary} />
          <Text style={styles.safetyBadgeText}>
            해당 정보는 대한민국 시니어 보건복지 연동 안심 네트워크 데이터 보호 장치 암호화(SSL
            256bit) 하에 철저하게 관리됩니다.
          </Text>
        </View>

        {/* Quick Action Button */}
        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [styles.backHomeButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.backHomeButtonText}>돌아가기</Text>
        </Pressable>
      </ScrollView>
    </GuardianTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  title: {
    fontSize: guardianFontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: guardianFontSizes.subtitle,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  stateText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowMuted: {
    backgroundColor: colors.background,
  },
  rowEditing: {
    backgroundColor: colors.primaryTintBackground,
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  rowValue: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  rowValueSmall: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  rowValueMuted: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.disabledText,
    marginTop: spacing.xs,
  },
  rowNoEdit: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.border,
  },
  editLink: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  editLinkHit: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    minWidth: GUARDIAN_MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  editWrap: {
    flex: 1,
    gap: spacing.sm,
  },
  editInput: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: guardianFontSizes.input,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  editInputMultiline: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET + 24,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  editCancelBtn: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  editSaveBtn: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveBtnDisabled: {
    opacity: 0.6,
  },
  editSaveText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  seniorSection: {
    gap: spacing.sm + spacing.xs,
  },
  sectionHeading: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.text,
    paddingHorizontal: spacing.xs,
  },
  seniorList: {
    gap: spacing.sm,
  },
  seniorRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  seniorRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
    flex: 1,
  },
  seniorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTintBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seniorAvatarText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  seniorTextWrap: {
    flex: 1,
  },
  seniorName: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  seniorId: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    marginTop: spacing.xs,
  },
  unlinkButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: 'rgba(254, 242, 242, 0.5)',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unlinkButtonPressed: {
    borderColor: colors.danger,
  },
  unlinkButtonText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  emptySeniorBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptySeniorText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textAlign: 'center',
    lineHeight: 18,
  },
  safetyBadge: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
  },
  safetyBadgeText: {
    flex: 1,
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
    lineHeight: 16,
  },
  backHomeButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHomeButtonText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
