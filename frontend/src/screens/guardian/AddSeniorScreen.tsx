import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Check,
  HelpCircle,
  QrCode,
  Scan,
  Search,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import { Senior } from '../../types';

// 아이디 검색 mock 결과 (실제로는 아직 등록되지 않은 새 피보호자 예시)
const MOCK_SEARCH_RESULTS: Record<string, Senior> = {
  silver333: {
    id: 'silver333',
    name: '정정자',
    status: 'not_connected',
    weeklyWorkoutCount: 1,
    avatarInitials: '정자',
    phone: '010-3333-4444',
    address: '서울시 은평구 녹번동 산7번지',
    diseases: '가벼운 난청',
  },
  silver555: {
    id: 'silver555',
    name: '최영수',
    status: 'stretch_completed',
    weeklyWorkoutCount: 3,
    avatarInitials: '영수',
    phone: '010-5555-6666',
    address: '서울시 성북구 한옥길 12',
    diseases: '경미한 허리 통증',
  },
};

// 바코드 스캔 mock 결과: mock 데이터 구조상 이미 김철수가 등록되어 있으므로,
// 실제 seniors 배열에 추가하지 않고 데모 성공 화면만 보여준다.
const MOCK_SCANNED_SENIOR_NAME = '김철수';

export default function AddSeniorScreen() {
  const navigation = useNavigation();
  const [searchId, setSearchId] = useState('');
  const [searchedSenior, setSearchedSenior] = useState<Senior | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isScanning) return;

    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanSuccess(`${MOCK_SCANNED_SENIOR_NAME} 어르신을 등록했습니다`);

          // TODO: 실제 등록 로직(seniors 배열 추가) 및 GuardianActivityList로 복귀 연결
          // (mock 데이터 구조상 김철수가 이미 등록되어 있어 중복 추가 방지 목적으로 스텁 처리)
          scanTimeoutRef.current = setTimeout(() => {
            console.log('[AddSeniorScreen] scan success, navigate back to GuardianActivityList (미구현)');
            setScanSuccess(null);
          }, 2000);

          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSearch = () => {
    if (!searchId.trim()) {
      setSearchError('검색할 아이디를 입력해 주세요.');
      setSearchedSenior(null);
      return;
    }

    const match = MOCK_SEARCH_RESULTS[searchId.trim().toLowerCase()];
    if (match) {
      setSearchError(null);
      setSearchedSenior(match);
    } else {
      setSearchError('입력하신 아이디와 일치하는 어르신 정보가 존재하지 않습니다.');
      setSearchedSenior(null);
    }
  };

  const handleRegisterSearched = () => {
    if (!searchedSenior) return;
    // TODO: 실제 등록 로직(seniors 배열 추가) 및 GuardianActivityList로 복귀 연결
    console.log(
      '[AddSeniorScreen] register searched senior, navigate back to GuardianActivityList (미구현):',
      searchedSenior.name,
    );
    Alert.alert('', `${searchedSenior.name} 어르신이 피보호자로 등록되었습니다!`);
  };

  const handleOpenScanner = () => {
    setIsScanning(true);
  };

  const handleCloseScanner = () => {
    setIsScanning(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Back Button */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>보호자 홈으로</Text>
        </Pressable>
        <Text style={styles.title}>피보호자 추가 등록</Text>
        <Text style={styles.subtitle}>
          조회 및 실시간 안전 모니터링을 연동할 어르신의 정보를 등록하세요.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Method 1: Search by ID */}
        <View style={styles.card}>
          <View style={styles.methodLabelRow}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>1</Text>
            </View>
            <Text style={styles.methodLabel}>아이디로 찾기</Text>
          </View>
          <Text style={styles.methodDescription}>
            어르신의 실버비전 앱 아이디(가입정보)를 직접 검색하여 등록합니다.
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchId}
              onChangeText={(text) => {
                setSearchId(text);
                setSearchError(null);
                setSearchedSenior(null);
              }}
              placeholder="예: silver333 또는 silver555"
              placeholderTextColor={colors.disabledText}
              autoCapitalize="none"
              style={styles.searchInput}
            />
            <Pressable
              onPress={handleSearch}
              style={({ pressed }) => [styles.searchButton, pressed && styles.pressedPrimary]}
            >
              <Search size={20} color={colors.white} strokeWidth={2.5} />
            </Pressable>
          </View>

          {searchError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {searchError}</Text>
            </View>
          ) : null}

          {searchedSenior ? (
            <View style={styles.resultBox}>
              <View style={styles.resultTopRow}>
                <View style={styles.resultAvatar}>
                  <Text style={styles.resultAvatarText}>{searchedSenior.avatarInitials}</Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>
                    {searchedSenior.name} 어르신을 찾았습니다!
                  </Text>
                  <Text style={styles.resultAddress}>주소: {searchedSenior.address}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleRegisterSearched}
                style={({ pressed }) => [
                  styles.registerButton,
                  pressed && styles.pressedPrimary,
                ]}
              >
                <Check size={16} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.registerButtonText}>이 피보호자로 연동 등록 완료하기</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Method 2: Scan QR / Barcode */}
        <View style={styles.card}>
          <View style={styles.methodLabelRow}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>2</Text>
            </View>
            <Text style={styles.methodLabel}>바코드로 바로 등록하기</Text>
          </View>
          <Text style={styles.methodDescription}>
            어르신의 모바일 화면 &apos;내 개인정보&apos; 하단에 활성화된 연동 바코드를 카메라로
            스캔하여 간편하게 등록합니다.
          </Text>

          <Pressable
            onPress={handleOpenScanner}
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
          >
            <View style={styles.scanIconWrap}>
              <QrCode size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.scanTextWrap}>
              <Text style={styles.scanButtonTitle}>스캔 카메라 켜기</Text>
              <Text style={styles.scanButtonSubtitle}>
                카메라로 어르신 화면의 바코드를 비추세요
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Guide Badge */}
      <View style={styles.guideBar}>
        <HelpCircle size={16} color={colors.border} />
        <Text style={styles.guideText}>
          가족 및 보호자가 원치 않는 타인의 모니터링 등록은 불가합니다.
        </Text>
      </View>

      {/* Simulated Scanner Modal */}
      {isScanning ? (
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerHeaderLeft}>
              <Scan size={18} color={colors.scoreGradientEnd} />
              <Text style={styles.scannerHeaderText}>바코드 자동 스캐너</Text>
            </View>
            <Pressable
              onPress={handleCloseScanner}
              style={({ pressed }) => [styles.scannerCloseButton, pressed && styles.pressedOpacity]}
            >
              <X size={18} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.scannerBody}>
            <Text style={styles.scannerHint}>
              어르신 휴대폰 하단의 개인정보에 표시된 바코드를 카메라 박스 안에 맞춰 주세요
            </Text>

            <View style={styles.viewfinder}>
              <View style={[styles.laserLine, { top: `${scanProgress}%` }]} />
              <QrCode size={72} color="rgba(16, 185, 129, 0.4)" strokeWidth={1.5} />
              <View style={styles.scanningBadge}>
                <Text style={styles.scanningBadgeText}>자동 스캔 및 분석 중...</Text>
              </View>
            </View>

            <Text style={styles.scanProgressText}>식별 프로세스 대기율: {scanProgress}%</Text>
          </View>
        </View>
      ) : null}

      {/* Scan Success Toast */}
      {scanSuccess ? (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Check size={28} color={colors.primary} strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>피보호자 등록 성공</Text>
            <Text style={styles.successMessage}>{scanSuccess}</Text>
            <Text style={styles.successSubtext}>
              자동으로 관제 센터 홈 화면으로 이동합니다.
            </Text>
          </View>
        </View>
      ) : null}
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
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
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
    marginTop: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md + spacing.xs,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  methodLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  methodBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryTintBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodBadgeText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  methodLabel: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  methodDescription: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  searchInput: {
    flex: 1,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  searchButton: {
    width: 64,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: colors.dangerBackground,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
  },
  errorText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  resultBox: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.primaryBorderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm + spacing.xs,
    marginTop: spacing.xs,
  },
  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  resultAddress: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.medium,
    color: colors.disabledText,
    marginTop: spacing.xs,
  },
  registerButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  registerButtonText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.border,
  },
  scanButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primaryTintBorder,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + spacing.xs,
  },
  scanButtonPressed: {
    borderColor: colors.primary,
  },
  scanIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  scanTextWrap: {
    alignItems: 'center',
  },
  scanButtonTitle: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  scanButtonSubtitle: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  guideBar: {
    padding: spacing.md,
    backgroundColor: colors.grayBadgeBackground,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  guideText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textAlign: 'center',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  scannerHeader: {
    padding: spacing.md + spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cameraViewport,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scannerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scannerHeaderText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.white,
  },
  scannerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cameraViewportDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scannerHint: {
    fontSize: guardianFontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.border,
    textAlign: 'center',
    maxWidth: 240,
    marginBottom: spacing.lg,
  },
  viewfinder: {
    width: 220,
    height: 220,
    borderWidth: 4,
    borderColor: colors.scoreGradientEnd,
    borderRadius: radius.lg + 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    overflow: 'hidden',
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.scoreGradientEnd,
  },
  scanningBadge: {
    position: 'absolute',
    bottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  scanningBadgeText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.scoreGradientEnd,
  },
  scanProgressText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.extrabold,
    color: colors.scoreGradientEnd,
    marginTop: spacing.lg,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.emeraldBackground,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.emeraldTextLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: guardianFontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  successSubtext: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.medium,
    color: colors.disabledText,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
});
