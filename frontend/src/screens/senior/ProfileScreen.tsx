import { Check, Edit2, QrCode, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import TabScreenLayout from '../../components/TabScreenLayout';
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

// 바코드 막대 너비 패턴 (원본 ai-studio-reference의 값 그대로 사용)
const BARCODE_BARS = [
  3, 6, 2, 4, 1, 8, 2, 5, 3, 2, 6, 2, 1, 4, 7, 2, 3, 5, 1, 8, 3, 2, 6, 1, 4, 2, 3, 5, 1, 6, 2, 4, 2, 3,
];

export default function ProfileScreen() {
  const { userProfile, setUserProfile } = useAppState();
  const [isEditing, setIsEditing] = useState(false);

  const [editedName, setEditedName] = useState(userProfile.name);
  const [editedPhone, setEditedPhone] = useState(userProfile.phone);
  const [editedAddress, setEditedAddress] = useState(userProfile.address);
  const [editedDiseases, setEditedDiseases] = useState(userProfile.diseases);
  const [editedActivity, setEditedActivity] = useState<ActivityLevel>(userProfile.activityLevel);
  const [editedMedication, setEditedMedication] = useState(userProfile.medication);

  const handleStartEdit = () => setIsEditing(true);

  const handleSave = () => {
    const updated: UserProfile = {
      ...userProfile,
      name: editedName,
      phone: editedPhone,
      address: editedAddress,
      diseases: editedDiseases,
      activityLevel: editedActivity,
      medication: editedMedication,
    };
    setUserProfile(updated);
    setIsEditing(false);
  };

  return (
    <TabScreenLayout activeTab="profile">
      {/* Sticky top header */}
      <View style={styles.header}>
        <Text style={styles.title}>어르신 개인정보</Text>

        {isEditing ? (
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressedPrimary]}
          >
            <Check size={18} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.saveButtonText}>저장</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleStartEdit}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressedOpacity]}
          >
            <Edit2 size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.editButtonText}>정보수정</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              <Text style={styles.summaryName}>{userProfile.name} 어르신</Text>
              <View style={styles.safeMemberBadge}>
                <Text style={styles.safeMemberBadgeText}>안전회원</Text>
              </View>
            </View>
            <View style={styles.summaryCodeRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.summaryCodeText}>실버비전 매칭 코드: SV-9982</Text>
            </View>
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
                <Pressable onPress={handleStartEdit}>
                  <Text style={styles.editLink}>수정하기</Text>
                </Pressable>
              )}
            </View>
            {isEditing ? (
              <TextInput value={editedName} onChangeText={setEditedName} style={styles.input} />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.name}</Text>
            )}
          </View>

          {/* 아이디 (수정 불가) */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldTopRow}>
              <Text style={styles.fieldLabel}>아이디</Text>
            </View>
            <Text style={styles.fieldValueDisabled}>{userProfile.id} (수정 불가)</Text>
          </View>

          {/* 연락처 */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldTopRow}>
              <Text style={styles.fieldLabel}>연락처</Text>
              {!isEditing && (
                <Pressable onPress={handleStartEdit}>
                  <Text style={styles.editLink}>수정하기</Text>
                </Pressable>
              )}
            </View>
            {isEditing ? (
              <TextInput
                value={editedPhone}
                onChangeText={setEditedPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.phone}</Text>
            )}
          </View>

          {/* 사시는 곳 */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldTopRow}>
              <Text style={styles.fieldLabel}>사시는 곳</Text>
              {!isEditing && (
                <Pressable onPress={handleStartEdit}>
                  <Text style={styles.editLink}>수정하기</Text>
                </Pressable>
              )}
            </View>
            {isEditing ? (
              <TextInput value={editedAddress} onChangeText={setEditedAddress} style={styles.input} />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.address}</Text>
            )}
          </View>

          {/* 보유 질환 */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldTopRow}>
              <Text style={styles.fieldLabel}>보유 질환</Text>
              {!isEditing && (
                <Pressable onPress={handleStartEdit}>
                  <Text style={styles.editLink}>수정하기</Text>
                </Pressable>
              )}
            </View>
            {isEditing ? (
              <TextInput value={editedDiseases} onChangeText={setEditedDiseases} style={styles.input} />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.diseases || '없음'}</Text>
            )}
          </View>

          {/* 거동 수준 */}
          <View style={styles.fieldRowLast}>
            <View style={styles.fieldTopRow}>
              <Text style={styles.fieldLabel}>거동 수준</Text>
              {!isEditing && (
                <Pressable onPress={handleStartEdit}>
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
              <Text style={styles.fieldValue}>{userProfile.activityLevel}</Text>
            )}
          </View>

          {/* 복용 중인 약 */}
          <View style={styles.fieldRowLast}>
            <View style={styles.fieldTopRow}>
              <Text style={styles.fieldLabel}>복용 중인 약</Text>
              {!isEditing && (
                <Pressable onPress={handleStartEdit}>
                  <Text style={styles.editLink}>수정하기</Text>
                </Pressable>
              )}
            </View>
            {isEditing ? (
              <TextInput value={editedMedication} onChangeText={setEditedMedication} style={styles.input} />
            ) : (
              <Text style={styles.fieldValue}>{userProfile.medication || '없음'}</Text>
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
            <Text style={styles.barcodeCode}>9982-1234-5678-SILVER</Text>
          </View>
        </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
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
  summaryCodeText: {
    fontSize: 15,
    fontWeight: fontWeights.semibold,
    color: colors.disabledText,
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
  },
  pressedPrimary: {
    backgroundColor: '#256428',
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
