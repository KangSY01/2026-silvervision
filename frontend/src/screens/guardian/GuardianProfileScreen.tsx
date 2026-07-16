import { useNavigation } from '@react-navigation/native';
import { ShieldCheck, UserMinus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { Senior } from '../../types';

export default function GuardianProfileScreen() {
  const navigation = useNavigation();
  const { guardianProfile, seniors } = useAppState();

  const handleEditField = (field: string) => {
    // TODO: 인라인 수정 기능 설계 및 구현 (백엔드 연동 후 진행)
    console.log('[GuardianProfileScreen] edit field (미구현):', field);
  };

  const handleUnlinkSenior = (senior: Senior) => {
    // TODO: 실제 연동 해제(seniors 배열에서 제거) 로직 및 확인 다이얼로그 연결
    console.log('[GuardianProfileScreen] unlink senior (미구현):', senior.name);
  };

  const handleGoHome = () => {
    navigation.navigate('GuardianHome');
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

        {/* Personal Details Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>성함</Text>
              <Text style={styles.rowValue}>{guardianProfile.name}</Text>
            </View>
            <Pressable
              onPress={() => handleEditField('name')}
              style={({ pressed }) => [pressed && styles.pressedOpacity]}
            >
              <Text style={styles.editLink}>수정</Text>
            </Pressable>
          </View>

          <View style={[styles.row, styles.rowMuted]}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>로그인 아이디</Text>
              <Text style={styles.rowValueMuted}>{guardianProfile.id}</Text>
            </View>
            <Text style={styles.rowNoEdit}>수정 불가</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>비밀번호</Text>
              <Text style={styles.rowValue}>••••</Text>
            </View>
            <Pressable
              onPress={() => handleEditField('password')}
              style={({ pressed }) => [pressed && styles.pressedOpacity]}
            >
              <Text style={styles.editLink}>수정</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>비상 연락처</Text>
              <Text style={styles.rowValue}>{guardianProfile.phone}</Text>
            </View>
            <Pressable
              onPress={() => handleEditField('phone')}
              style={({ pressed }) => [pressed && styles.pressedOpacity]}
            >
              <Text style={styles.editLink}>수정</Text>
            </Pressable>
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>비상 이송/거주지 주소</Text>
              <Text style={styles.rowValueSmall}>{guardianProfile.address}</Text>
            </View>
            <Pressable
              onPress={() => handleEditField('address')}
              style={({ pressed }) => [pressed && styles.pressedOpacity]}
            >
              <Text style={styles.editLink}>수정</Text>
            </Pressable>
          </View>
        </View>

        {/* Linked Seniors Management */}
        <View style={styles.seniorSection}>
          <Text style={styles.sectionHeading}>등록된 안심 피보호자 목록</Text>

          {seniors.length > 0 ? (
            <View style={styles.seniorList}>
              {seniors.map((senior) => (
                <View key={senior.id} style={styles.seniorRow}>
                  <View style={styles.seniorRowLeft}>
                    <View style={styles.seniorAvatar}>
                      <Text style={styles.seniorAvatarText}>{senior.avatarInitials}</Text>
                    </View>
                    <View>
                      <Text style={styles.seniorName}>{senior.name} 어르신</Text>
                      <Text style={styles.seniorId}>아이디: {senior.id}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleUnlinkSenior(senior)}
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
    minHeight: 36,
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
