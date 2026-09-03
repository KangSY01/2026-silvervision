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
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  apiClient,
  ApiError,
  getApiErrorMessage,
  getSession,
  GuardianSeniorMapResponse,
  MappedSeniorResponse,
} from '../../api/client';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';

// 백엔드 등록 요청 body. 검색 전용 엔드포인트가 없어 조회+등록을 한 번에
// 처리하며(POST /guardian/{id}/seniors/), registered_via에 따라 서버가
// login_id 또는 barcode_code로 피보호자를 조회한다
// (GuardianSeniorMapCreateSerializer 참고).
type RegisterPayload =
  | { registered_via: 'id_search'; login_id: string }
  | { registered_via: 'barcode'; barcode_code: string };

export default function AddSeniorScreen() {
  const navigation = useNavigation();

  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSubmitting, setSearchSubmitting] = useState(false);

  const [barcodeCode, setBarcodeCode] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // 두 등록 경로(아이디/바코드)의 공통 성공 상태. 등록된 피보호자 요약(nested)을
  // 담아 성공 오버레이에 표시한다.
  const [registeredSenior, setRegisteredSenior] = useState<MappedSeniorResponse | null>(null);

  // 스캔 뷰파인더 레이저 애니메이션은 순수 연출이다. 실제 카메라 기반 QR/바코드
  // 스캔은 expo-camera 등 신규 네이티브 의존성이 필요하고 비전팀의 자세 추정
  // 모듈과도 무관한 별개 기능이라, 시연 일정을 고려해 이번 배치에서는 넣지 않는다.
  // 대신 스캐너 모달 안에서 바코드 코드를 직접 입력받아 barcode_code로 등록한다.
  useEffect(() => {
    if (!isScanning) return;
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 200);
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleBack = () => {
    navigation.goBack();
  };

  const registerSenior = async (
    payload: RegisterPayload,
    setError: (message: string | null) => void,
    setBusy: (busy: boolean) => void,
  ) => {
    setError(null);
    setBusy(true);
    try {
      const session = await getSession();
      if (!session) {
        setError('세션이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }
      const mapping = await apiClient.post<GuardianSeniorMapResponse>(
        `/guardian/${session.userId}/seniors/`,
        payload,
      );
      setIsScanning(false);
      setRegisteredSenior(mapping.senior);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('입력하신 정보와 일치하는 어르신을 찾을 수 없습니다. 아이디/바코드를 다시 확인해 주세요.');
      } else if (err instanceof ApiError && err.status === 409) {
        setError('이미 등록된 피보호자입니다.');
      } else {
        setError(getApiErrorMessage(err, '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = () => {
    if (searchSubmitting) return;
    const trimmed = searchId.trim();
    if (!trimmed) {
      setSearchError('검색할 아이디를 입력해 주세요.');
      return;
    }
    registerSenior(
      { registered_via: 'id_search', login_id: trimmed },
      setSearchError,
      setSearchSubmitting,
    );
  };

  const handleBarcodeSubmit = () => {
    if (scanSubmitting) return;
    const trimmed = barcodeCode.trim();
    if (!trimmed) {
      setScanError('연동 바코드 코드를 입력해 주세요.');
      return;
    }
    registerSenior(
      { registered_via: 'barcode', barcode_code: trimmed },
      setScanError,
      setScanSubmitting,
    );
  };

  const handleOpenScanner = () => {
    setScanError(null);
    setIsScanning(true);
  };

  const handleCloseScanner = () => {
    setIsScanning(false);
    setScanError(null);
  };

  const handleSuccessConfirm = () => {
    navigation.navigate('GuardianHome');
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
        {/* Method 1: Search by ID (조회 + 등록을 한 번에 처리) */}
        <View style={styles.card}>
          <View style={styles.methodLabelRow}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>1</Text>
            </View>
            <Text style={styles.methodLabel}>아이디로 찾아 등록하기</Text>
          </View>
          <Text style={styles.methodDescription}>
            어르신의 실버비전 앱 아이디(가입정보)를 입력하면 조회와 동시에 피보호자로 연동
            등록됩니다.
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              value={searchId}
              onChangeText={(text) => {
                setSearchId(text);
                setSearchError(null);
              }}
              placeholder="예: silver333"
              placeholderTextColor={colors.disabledText}
              autoCapitalize="none"
              editable={!searchSubmitting}
              onSubmitEditing={handleSearch}
              style={styles.searchInput}
            />
            <Pressable
              onPress={handleSearch}
              disabled={searchSubmitting}
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.pressedPrimary,
                searchSubmitting && styles.buttonDisabled,
              ]}
            >
              <Search size={20} color={colors.white} strokeWidth={2.5} />
            </Pressable>
          </View>

          {searchSubmitting ? (
            <Text style={styles.helperText}>조회 및 등록 중...</Text>
          ) : null}

          {searchError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {searchError}</Text>
            </View>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Method 2: Barcode */}
        <View style={styles.card}>
          <View style={styles.methodLabelRow}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>2</Text>
            </View>
            <Text style={styles.methodLabel}>바코드로 바로 등록하기</Text>
          </View>
          <Text style={styles.methodDescription}>
            어르신의 모바일 화면 &apos;내 개인정보&apos; 하단에 활성화된 연동 바코드를 스캔하거나,
            바코드 아래의 코드를 직접 입력하여 등록합니다.
          </Text>

          <Pressable
            onPress={handleOpenScanner}
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
          >
            <View style={styles.scanIconWrap}>
              <QrCode size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.scanTextWrap}>
              <Text style={styles.scanButtonTitle}>스캔 화면 열기</Text>
              <Text style={styles.scanButtonSubtitle}>
                바코드를 비추거나 코드를 직접 입력하세요
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

      {/* Scanner Modal — 레이저 애니메이션은 연출, 실제 등록은 코드 직접 입력 */}
      {isScanning ? (
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerHeaderLeft}>
              <Scan size={18} color={colors.scoreGradientEnd} />
              <Text style={styles.scannerHeaderText}>바코드 연동 등록</Text>
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
              어르신 휴대폰 하단 개인정보에 표시된 연동 바코드를 카메라 박스 안에 맞추거나,
              바코드 아래 코드를 아래 칸에 입력해 주세요
            </Text>

            <View style={styles.viewfinder}>
              <View style={[styles.laserLine, { top: `${scanProgress}%` }]} />
              <QrCode size={72} color="rgba(16, 185, 129, 0.4)" strokeWidth={1.5} />
              <View style={styles.scanningBadge}>
                <Text style={styles.scanningBadgeText}>바코드를 비춰 주세요</Text>
              </View>
            </View>

            <View style={styles.scannerForm}>
              <TextInput
                value={barcodeCode}
                onChangeText={(text) => {
                  setBarcodeCode(text);
                  setScanError(null);
                }}
                placeholder="연동 바코드 코드 직접 입력"
                placeholderTextColor={colors.disabledText}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!scanSubmitting}
                onSubmitEditing={handleBarcodeSubmit}
                style={styles.barcodeInput}
              />
              <Pressable
                onPress={handleBarcodeSubmit}
                disabled={scanSubmitting}
                style={({ pressed }) => [
                  styles.barcodeSubmitButton,
                  pressed && styles.pressedPrimary,
                  scanSubmitting && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.barcodeSubmitButtonText}>
                  {scanSubmitting ? '등록 중...' : '이 바코드로 등록하기'}
                </Text>
              </Pressable>

              {scanError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {scanError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* 등록 성공 오버레이 (아이디/바코드 공통) */}
      {registeredSenior ? (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Check size={28} color={colors.primary} strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>피보호자 등록 성공</Text>
            <Text style={styles.successMessage}>
              {registeredSenior.name} 어르신을 피보호자로 등록했습니다.
            </Text>
            <Text style={styles.successSubtext}>
              보호자 홈에서 등록된 피보호자 목록을 확인할 수 있습니다.
            </Text>
            <Pressable
              onPress={handleSuccessConfirm}
              style={({ pressed }) => [styles.successButton, pressed && styles.pressedPrimary]}
            >
              <Text style={styles.successButtonText}>보호자 홈으로 이동</Text>
            </Pressable>
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
  buttonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
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
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  viewfinder: {
    width: 200,
    height: 200,
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
  scannerForm: {
    width: '100%',
    maxWidth: 320,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  barcodeInput: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  barcodeSubmitButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeSubmitButtonText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.white,
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
  successButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  successButtonText: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
});
