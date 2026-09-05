import { useFocusEffect } from '@react-navigation/native';
import { Check, Edit2, QrCode, ShieldCheck } from 'lucide-react-native';
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
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import {
  apiClient,
  getApiErrorMessage,
  getSession,
  SeniorProfileResponse,
} from '../../api/client';
import TabScreenLayout from '../../components/TabScreenLayout';
import { useAppState } from '../../context/AppStateContext';
import {
  ACTIVITY_LEVEL_TO_MOBILITY_LEVEL,
  MOBILITY_LEVEL_TO_ACTIVITY_LEVEL,
} from '../../labels';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../../theme/theme';
import { ActivityLevel } from '../../types';

type LoadState = 'loading' | 'ready' | 'error';

const ACTIVITY_LEVELS: ActivityLevel[] = ['독립', '부분 보조', '완전 보조'];

// 바코드 막대 너비 패턴 (원본 ai-studio-reference의 값 그대로 사용)
const BARCODE_BARS = [
  3, 6, 2, 4, 1, 8, 2, 5, 3, 2, 6, 2, 1, 4, 7, 2, 3, 5, 1, 8, 3, 2, 6, 1, 4, 2, 3, 5, 1, 6, 2, 4, 2, 3,
];

// barcode_code는 백엔드에서 uuid4().hex.upper()로 생성돼 대시 없는 32자리 대문자
// hex 문자열이다. 어르신이 보호자에게 불러주거나 눈으로 대조하기 쉽도록 8자리씩
// 4묶음으로 끊어 표시한다(원본 목업의 '9982-1234-5678-SILVER'와 같은 4묶음 형태).
function formatBarcodeCode(code: string): string {
  const cleaned = code.trim();
  if (!cleaned) return '';
  return cleaned.match(/.{1,8}/g)?.join('-') ?? cleaned;
}

export default function ProfileScreen() {
  const { setUserProfile } = useAppState();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [profile, setProfile] = useState<SeniorProfileResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedAddress, setEditedAddress] = useState('');
  const [editedDiseases, setEditedDiseases] = useState('');
  const [editedActivity, setEditedActivity] = useState<ActivityLevel>('독립');
  const [editedMedication, setEditedMedication] = useState('');

  // 진입/복귀마다 재조회(다른 연동 화면과 동일 패턴). 최초만 'loading'을 노출하고
  // 이후 포커스 재조회는 기존 화면을 둔 채 조용히 갱신한다.
  const load = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const res = await apiClient.get<SeniorProfileResponse>(`/senior/${session.userId}/`);
      setProfile(res);
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
        setIsEditing(false);
        setSaving(false);
      };
    }, [load]),
  );

  // "정보수정" 하나로 6개 필드를 한꺼번에 편집 모드로 전환한다(보호자 화면의
  // 필드별 인라인 편집과 달리 어르신 화면은 전체 편집 토글 유지 - 판단 근거는 PR 설명).
  const handleStartEdit = () => {
    if (!profile) return;
    setEditedName(profile.name);
    setEditedPhone(profile.phone);
    setEditedAddress(profile.address);
    setEditedDiseases(profile.diseases);
    setEditedMedication(profile.medication);
    setEditedActivity(MOBILITY_LEVEL_TO_ACTIVITY_LEVEL[profile.mobility_level]);
    setIsEditing(true);
  };

  const handleCancel = () => setIsEditing(false);

  const handleSave = async () => {
    if (!profile) return;
    const name = editedName.trim();
    const phone = editedPhone.trim();
    const address = editedAddress.trim();
    // name/phone/address는 백엔드 CharField(blank 불가)라 비우면 400이 난다.
    // diseases/medication은 TextField(blank=True)라 비워도 된다.
    if (!name || !phone || !address) {
      Alert.alert('입력 확인', '성함·연락처·사시는 곳은 비워 둘 수 없습니다.');
      return;
    }

    const body = {
      name,
      phone,
      address,
      diseases: editedDiseases.trim(),
      medication: editedMedication.trim(),
      mobility_level: ACTIVITY_LEVEL_TO_MOBILITY_LEVEL[editedActivity],
    };

    setSaving(true);
    try {
      const session = await getSession();
      if (!session) {
        Alert.alert('세션 만료', '다시 로그인해 주세요.');
        return;
      }
      const updated = await apiClient.patch<SeniorProfileResponse>(
        `/senior/${session.userId}/`,
        body,
      );
      setProfile(updated);
      // SeniorHome 인사말·음성 어시스턴트가 읽는 공용 상태도 갱신한다.
      // fruitCount/pw는 이 화면이 건드리지 않으므로 함수형 업데이트로 보존한다.
      setUserProfile((prev) => ({
        ...prev,
        name: updated.name,
        phone: updated.phone,
        address: updated.address,
        diseases: updated.diseases,
        medication: updated.medication,
        activityLevel: MOBILITY_LEVEL_TO_ACTIVITY_LEVEL[updated.mobility_level],
      }));
      setIsEditing(false);
    } catch (err) {
      Alert.alert('수정 실패', getApiErrorMessage(err, '잠시 후 다시 시도해 주세요.'));
    } finally {
      setSaving(false);
    }
  };

  const ready = loadState === 'ready' && profile !== null;

  return (
    <TabScreenLayout activeTab="profile">
      {/* Sticky top header */}
      <View style={styles.header}>
        <Text style={styles.title}>어르신 개인정보</Text>

        {ready && isEditing ? (
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleCancel}
              disabled={saving}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressedOpacity]}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressedPrimary,
                saving && styles.primaryDisabled,
              ]}
            >
              <Check size={18} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.saveButtonText}>{saving ? '저장 중...' : '저장'}</Text>
            </Pressable>
          </View>
        ) : ready ? (
          <Pressable
            onPress={handleStartEdit}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressedOpacity]}
          >
            <Edit2 size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.editButtonText}>정보수정</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!ready ? (
          <Text style={styles.stateText}>
            {loadState === 'loading'
              ? '개인정보를 불러오는 중입니다...'
              : '개인정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'}
          </Text>
        ) : (
          <>
            {/* Profile Card Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.avatar}>
                <Svg width={64} height={64} viewBox="0 0 100 100">
                  {/* 머리(쪽진 머리) */}
                  <Circle cx={50} cy={22} r={14} fill={colors.hairColor} />
                  <Circle cx={50} cy={35} r={22} fill={colors.hairColor} />
                  {/* 얼굴 */}
                  <Circle cx={50} cy={54} r={22} fill={colors.skinTone} />
                  {/* 머리 하이라이트 */}
                  <Circle cx={42} cy={34} r={5} fill={colors.hairHighlight} />
                  <Circle cx={58} cy={34} r={5} fill={colors.hairHighlight} />
                  {/* 안경 */}
                  <Circle cx={42} cy={50} r={8} stroke={colors.glassesColor} strokeWidth={2.5} fill="none" />
                  <Circle cx={58} cy={50} r={8} stroke={colors.glassesColor} strokeWidth={2.5} fill="none" />
                  <Line x1={50} y1={50} x2={50} y2={50} stroke={colors.glassesColor} strokeWidth={3} />
                  {/* 미소 */}
                  <Path
                    d="M 44,64 Q 50,70 56,64"
                    stroke={colors.smileColor}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* 옷 */}
                  <Path d="M 24,85 C 24,72 36,75 50,75 C 64,75 76,72 76,85 Z" fill={colors.clothesColor} />
                </Svg>
              </View>

              <View style={styles.summaryInfo}>
                <View style={styles.summaryNameRow}>
                  <Text style={styles.summaryName}>{profile.name} 어르신</Text>
                  <View style={styles.safeMemberBadge}>
                    <Text style={styles.safeMemberBadgeText}>안전회원</Text>
                  </View>
                </View>
                <View style={styles.summaryCodeRow}>
                  <ShieldCheck size={16} color={colors.primary} />
                  <Text style={styles.summaryCodeLabel}>실버비전 매칭 코드</Text>
                </View>
                <Text style={styles.summaryCodeValue}>
                  {profile.barcode_code ? formatBarcodeCode(profile.barcode_code) : '정보 없음'}
                </Text>
              </View>
            </View>

            {/* Details Listing */}
            <View style={styles.detailsCard}>
              <View style={styles.detailsBadge}>
                <Text style={styles.detailsBadgeText}>📋 세부 인적 사항</Text>
              </View>

              {/* 성함 */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>성함</Text>
                  {!isEditing && (
                    <Pressable onPress={handleStartEdit} style={styles.editLinkHit}>
                      <Text style={styles.editLink}>수정하기</Text>
                    </Pressable>
                  )}
                </View>
                {isEditing ? (
                  <TextInput
                    value={editedName}
                    onChangeText={setEditedName}
                    editable={!saving}
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.name}</Text>
                )}
              </View>

              {/* 아이디 (수정 불가) */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>아이디</Text>
                </View>
                <Text style={styles.fieldValueDisabled}>{profile.login_id} (수정 불가)</Text>
              </View>

              {/* 연락처 */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>연락처</Text>
                  {!isEditing && (
                    <Pressable onPress={handleStartEdit} style={styles.editLinkHit}>
                      <Text style={styles.editLink}>수정하기</Text>
                    </Pressable>
                  )}
                </View>
                {isEditing ? (
                  <TextInput
                    value={editedPhone}
                    onChangeText={setEditedPhone}
                    keyboardType="phone-pad"
                    editable={!saving}
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.phone}</Text>
                )}
              </View>

              {/* 사시는 곳 */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>사시는 곳</Text>
                  {!isEditing && (
                    <Pressable onPress={handleStartEdit} style={styles.editLinkHit}>
                      <Text style={styles.editLink}>수정하기</Text>
                    </Pressable>
                  )}
                </View>
                {isEditing ? (
                  <TextInput
                    value={editedAddress}
                    onChangeText={setEditedAddress}
                    editable={!saving}
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.address}</Text>
                )}
              </View>

              {/* 보유 질환 */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>보유 질환</Text>
                  {!isEditing && (
                    <Pressable onPress={handleStartEdit} style={styles.editLinkHit}>
                      <Text style={styles.editLink}>수정하기</Text>
                    </Pressable>
                  )}
                </View>
                {isEditing ? (
                  <TextInput
                    value={editedDiseases}
                    onChangeText={setEditedDiseases}
                    editable={!saving}
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.diseases || '없음'}</Text>
                )}
              </View>

              {/* 거동 수준 */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>거동 수준</Text>
                  {!isEditing && (
                    <Pressable onPress={handleStartEdit} style={styles.editLinkHit}>
                      <Text style={styles.editLink}>수정하기</Text>
                    </Pressable>
                  )}
                </View>
                {isEditing ? (
                  <View style={styles.activityRow}>
                    {ACTIVITY_LEVELS.map((level) => {
                      const isActive = editedActivity === level;
                      return (
                        <Pressable
                          key={level}
                          onPress={() => setEditedActivity(level)}
                          disabled={saving}
                          style={({ pressed }) => [
                            styles.activityButton,
                            isActive && styles.activityButtonActive,
                            pressed && !isActive && styles.activityButtonPressed,
                          ]}
                        >
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
                ) : (
                  <Text style={styles.fieldValue}>
                    {MOBILITY_LEVEL_TO_ACTIVITY_LEVEL[profile.mobility_level]}
                  </Text>
                )}
              </View>

              {/* 복용 중인 약 */}
              <View style={styles.fieldRowLast}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.fieldLabel}>복용 중인 약</Text>
                  {!isEditing && (
                    <Pressable onPress={handleStartEdit} style={styles.editLinkHit}>
                      <Text style={styles.editLink}>수정하기</Text>
                    </Pressable>
                  )}
                </View>
                {isEditing ? (
                  <TextInput
                    value={editedMedication}
                    onChangeText={setEditedMedication}
                    editable={!saving}
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.medication || '없음'}</Text>
                )}
              </View>
            </View>

            {/* Barcode Section */}
            <View style={styles.barcodeCard}>
              <View style={styles.barcodeTitleRow}>
                <QrCode size={20} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.barcodeTitle}>가족 연동용 안심 바코드</Text>
              </View>
              <Text style={styles.barcodeDescription}>
                보호자(가족/요양사)가 아래 바코드를 스캔하면 어르신의 실시간 운동 기록과 나무 완성도를 확인할 수 있습니다.
              </Text>

              <View style={styles.barcodeBox}>
                <Svg width="100%" height={48} viewBox="0 0 200 60">
                  {BARCODE_BARS.map((w, idx) => {
                    const xOffset = 10 + idx * 5.3;
                    if (idx % 2 === 0 && xOffset < 190) {
                      return (
                        <Rect
                          key={idx}
                          x={xOffset}
                          y={5}
                          width={Math.min(w, 4)}
                          height={50}
                          fill={colors.barcodeBar}
                        />
                      );
                    }
                    return null;
                  })}
                </Svg>
                <Text style={styles.barcodeCode}>
                  {profile.barcode_code ? formatBarcodeCode(profile.barcode_code) : '정보 없음'}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </TabScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  cancelButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  stateText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    lineHeight: 28,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.md + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.avatarBackground,
    borderWidth: 4,
    borderColor: colors.avatarBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  summaryName: {
    fontSize: 24,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  safeMemberBadge: {
    backgroundColor: colors.primaryTintBackground,
    borderRadius: 4,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  safeMemberBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  summaryCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  summaryCodeLabel: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.disabledText,
  },
  summaryCodeValue: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: 1,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.md + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  detailsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.emeraldBackground,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailsBadgeText: {
    fontSize: 14,
    fontWeight: fontWeights.black,
    color: colors.emeraldTextDeep,
  },
  fieldRow: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  fieldRowLast: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  fieldTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  editLinkHit: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  editLink: {
    fontSize: 14,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  fieldValue: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  fieldValueDisabled: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + spacing.xs,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  activityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activityButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activityButtonPressed: {
    borderColor: colors.primary,
  },
  activityButtonText: {
    fontSize: 16,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  activityButtonTextActive: {
    color: colors.white,
  },
  barcodeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.treeCardBorder,
    padding: spacing.md + spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  barcodeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  barcodeTitle: {
    fontSize: 16,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  barcodeDescription: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  barcodeBox: {
    width: '100%',
    maxWidth: 260,
    backgroundColor: colors.barcodeBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  barcodeCode: {
    fontSize: 13,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    letterSpacing: 2,
    textAlign: 'center',
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
