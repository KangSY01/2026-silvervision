// 시니어 친화 공통 테마: 고대비, 큰 글씨(20pt+), 넓은 터치 영역(56dp+)
export const colors = {
  background: '#F5F7F3',
  surface: '#FFFFFF',
  primary: '#2E7D32',
  primaryLight: '#66BB6A',
  text: '#1B1B1B',
  textSecondary: '#5F6F5F',
  border: '#D1D5DB', // gray-300
  borderLight: '#E5E7EB', // gray-200
  disabledText: '#6B7280', // gray-500
  white: '#FFFFFF',
  danger: '#E53935',
  dangerBackground: '#FEF2F2', // red-50
  dangerBorder: '#FEE2E2', // red-100
  overlay: 'rgba(17, 24, 39, 0.9)', // gray-900/90
  shadow: '#000000',
  textMuted: '#374151', // gray-700 (비활성 토글 버튼 텍스트)
  inactiveIcon: '#9E9E9E', // gray-400 (비활성 탭 아이콘)

  // 순위 카드 포인트 컬러
  amberBackground: '#FFFBEB', // amber-50
  amberIcon: '#D97706', // amber-600
  amberFill: '#F59E0B', // amber-500
  emeraldBackground: '#ECFDF5', // emerald-50
  emeraldTextLight: '#D1FAE5', // emerald-100
  treeCardBorder: 'rgba(16, 185, 129, 0.15)', // emerald-50/60

  // primary 톤의 은은한 배경/보더 (bg-[#2E7D32]/5, /10 등)
  primarySoftBackground: 'rgba(46, 125, 50, 0.05)',
  primarySoftBorder: 'rgba(46, 125, 50, 0.05)',
  primaryTintBackground: 'rgba(46, 125, 50, 0.1)',
  primaryTintBorder: 'rgba(46, 125, 50, 0.15)',

  // 건강 나무 일러스트 전용 컬러
  treeTrunk: '#795548',
  treeLeafDark: '#388E3C',
  treeLeafMid: '#4CAF50',
  treeLeafDeep: '#2E7D32',
  treeLeafLight: '#66BB6A',
  treeLeafPale: '#81C784',

  // 운동 카드 배지 컬러
  amberSoftBackground: 'rgba(245, 158, 11, 0.1)', // amber-500/10
  amberText: '#B45309', // amber-700
  grayBadgeBackground: '#F3F4F6', // gray-100
  primarySoftBorderStrong: 'rgba(46, 125, 50, 0.1)', // primary/10

  // 보호자(guardian) 대시보드 알림 피드 아이콘 배경 전용 컬러
  amberIconBackground: '#FEF3C7', // amber-100

  // 운동 진행(카메라) 화면 전용 다크 컬러
  black: '#000000',
  cameraViewport: '#111827', // gray-900
  cameraViewportDeep: '#030712', // gray-950
  overlayDark: 'rgba(0, 0, 0, 0.6)', // bg-black/60
  overlayLight: 'rgba(255, 255, 255, 0.1)', // bg-white/10
  overlayLightBorder: 'rgba(255, 255, 255, 0.15)', // border-white/15
  targetGreen: '#34D399', // emerald-400 (자세 가이드 실루엣)
  warningBackground: 'rgba(245, 158, 11, 0.95)', // amber-500/95
  warningBorder: '#FCD34D', // amber-300
  primaryBorderStrong: 'rgba(46, 125, 50, 0.2)', // primary/20 (스캔 프레임 보더)

  // 운동 분석 결과(관절 진단) 화면 전용 컬러
  silhouette: '#E2E8F0', // slate-200 (신체 실루엣)
  jointLineNeutral: '#475569', // slate-600 (척추 라인)
  scoreGradientStart: '#EF4444', // red-500
  scoreGradientMid: '#FBBF24', // amber-400
  scoreGradientEnd: '#10B981', // emerald-500
  emeraldSoftBackground: 'rgba(236, 253, 245, 0.7)', // emerald-50/70
  emeraldBorderLight: '#D1FAE5', // emerald-100
  amberGradientEnd: 'rgba(254, 243, 199, 0.5)', // amber-100/50
  amberCardBorder: '#FDE68A', // amber-200
  amberTextDeep: '#92400E', // amber-800

  // 개인정보 화면 전용 컬러
  avatarBackground: '#ECFDF5', // emerald-50
  avatarBorder: '#66BB6A',
  hairColor: '#CFD8DC',
  hairHighlight: '#ECEFF1',
  skinTone: '#FFE0B2',
  glassesColor: '#37474F',
  smileColor: '#D84315',
  clothesColor: '#66BB6A',
  barcodeBackground: '#F5F7F3',
  barcodeBar: '#1B1B1B',
  emeraldTextDeep: '#065F46', // emerald-800 ("세부 인적 사항" 배지 텍스트)
  dangerBorderStrong: '#F87171', // red-400 (피드백 콜아웃 버블 보더)

  // 음성 인식 모달(참고용, 아직 미사용) 전용 컬러
  modalDragHandle: '#D1D5DB', // gray-300
  modalCloseBackground: '#F3F4F6', // gray-100
  listeningRingOuter: 'rgba(46, 125, 50, 0.1)',
  listeningRingInner: 'rgba(46, 125, 50, 0.05)',
  suggestionPressedBackground: '#E8EFE5',

  // 보호자(guardian) 알림 상태 배지 전용 컬러 ("오탐" 등 파란색 계열 - 시니어 화면엔 없음)
  guardianInfoBackground: '#EFF6FF', // blue-50
  guardianInfoBorder: '#DBEAFE', // blue-100
  guardianInfoText: '#1D4ED8', // blue-700
};

export const fontSizes = {
  brand: 36,
  title: 30,
  sectionTitle: 28,
  subtitle: 22,
  body: 20,
  label: 20,
  button: 20,
  caption: 20,
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  md: 16,
  lg: 24,
};

// 시니어 UI 규칙: 터치 타겟 최소 56dp
export const MIN_TOUCH_TARGET = 56;

// 보호자(guardian) 전용 폰트 크기: 시니어 UI 규칙(20pt+)은 시니어 화면 전용이며,
// 보호자는 비-시니어 사용자이므로 ai-studio-reference 원본 크기를 그대로 따른다.
export const guardianFontSizes = {
  title: 26, // 로그인/회원가입 화면 타이틀
  subtitle: 14, // 화면 서브타이틀 설명문
  label: 15, // 폼 라벨(로그인), 보조 버튼 텍스트
  labelSmall: 14, // 폼 라벨(회원가입)
  input: 16, // 입력 필드(로그인), 강조 숫자
  inputSmall: 15, // 입력 필드(회원가입)
  button: 17, // 주요 액션 버튼, 카드 타이틀
  badge: 12, // 상단 뱃지/오버라인/캡션류
  error: 14, // 에러 메시지
  link: 14, // 링크형 텍스트
  heading: 20, // 대시보드 웰컴 인사말, 섹션 헤딩, 상단 워드마크
  cardTitle: 17, // 리스트 카드 타이틀(피보호자 이름), 섹션 타이틀
  body: 13, // 대시보드/카드 본문 텍스트
  small: 11, // 보조 라벨(오버라인, 탭 라벨, 헤더 뱃지)
  tiny: 10, // 최소 보조 텍스트(타임스탬프 등)
};

// 보호자 전용 최소 터치 영역: 시니어 MIN_TOUCH_TARGET(56)과 달리 원본 기준(44)을 따른다.
export const GUARDIAN_MIN_TOUCH_TARGET = 44;
