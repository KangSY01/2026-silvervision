import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Play,
  User,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useAppState } from '../../context/AppStateContext';
import { RootStackParamList } from '../../navigation/types';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';

const TIMELINE = [
  {
    id: 't1',
    time: '10:15:30',
    text: '바닥 충격 가속도 센서 임계치 도달 및 분석 트리거',
    dotColor: 'danger' as const,
  },
  {
    id: 't2',
    time: '10:15:32',
    text: '3D 스켈레톤 관절 추적 결과, 와상 상태(바닥 누워있음) 유지 판독',
    dotColor: 'danger' as const,
  },
  {
    id: 't3',
    time: '10:15:35',
    text: '90초간 동작 비연결 및 호흡 주기 불규칙 감지',
    dotColor: 'warn' as const,
  },
  {
    id: 't4',
    time: '10:15:40',
    text: '스마트 홈 스피커 음성 확인 결과 ("어르신 괜찮으세요?") 무응답',
    dotColor: 'ok' as const,
  },
];

export default function AlertDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AlertDetail'>>();
  const { alerts, seniors } = useAppState();

  const alert = alerts.find((item) => item.id === route.params.alertId);
  const senior = seniors.find((item) => item.name === alert?.seniorName);

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePlayReplay = () => {
    // TODO: 실제 리플레이 영상 재생 기능 연결 (영상 데이터 없음)
    console.log('[AlertDetailScreen] play skeletal replay (미구현)');
  };

  const handleMarkFalsePositive = () => {
    // TODO: 실제 알림 상태 변경(오탐 처리) 로직 연결
    console.log('[AlertDetailScreen] mark as false positive (미구현):', alert?.id);
  };

  const handleConfirm = () => {
    // TODO: 실제 알림 상태 변경(확인 완료) 로직 연결
    console.log('[AlertDetailScreen] confirm alert (미구현):', alert?.id);
  };

  const handleReopen = () => {
    // TODO: 실제 알림 상태 변경(미확인으로 재지정) 로직 연결
    console.log('[AlertDetailScreen] reopen alert (미구현):', alert?.id);
  };

  if (!alert) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>선택된 알림 정보가 없습니다.</Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.notFoundButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.notFoundButtonText}>목록으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  let statusBadgeText = '미확인';
  let statusBadgeStyle = styles.statusBadgeUnconfirmed;
  let statusBadgeTextStyle = styles.statusBadgeTextUnconfirmed;
  if (alert.status === '확인됨') {
    statusBadgeText = '확인 완료';
    statusBadgeStyle = styles.statusBadgeOk;
    statusBadgeTextStyle = styles.statusBadgeTextOk;
  } else if (alert.status === '오탐') {
    statusBadgeText = '오보 (오탐)';
    statusBadgeStyle = styles.statusBadgeWarn;
    statusBadgeTextStyle = styles.statusBadgeTextWarn;
  }

  const typeLabel = alert.type === 'fall' ? '낙상 감지' : '부상 의심';
  // 원본 참고 소스는 연락처/주소를 알림과 무관한 고정값으로 표시했으나,
  // 실제로는 seniors 목록의 진짜 정보와 어긋나므로 연동해서 정확한 값을 보여준다.
  const contactPhone = senior?.phone || '정보 없음';
  const contactAddress = senior?.address || '정보 없음';

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
        >
          <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.backButtonText}>알림 목록으로</Text>
        </Pressable>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleLeft}>
            <Text style={styles.title}>실시간 분석 리포트</Text>
            <Text style={styles.subtitle}>{alert.seniorName} 어르신 스마트 관절 분석 데이터</Text>
          </View>
          <View style={statusBadgeStyle}>
            <Text style={statusBadgeTextStyle}>{statusBadgeText}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Core Event Information Card */}
        <View style={styles.card}>
          <View style={styles.eventRow}>
            <View
              style={[
                styles.eventIconWrap,
                alert.status === '미확인' && styles.eventIconWrapUnconfirmed,
              ]}
            >
              <AlertTriangle size={22} color={colors.danger} strokeWidth={2} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventOverline}>발생 경보</Text>
              <Text style={styles.eventTitle}>{alert.message || `${typeLabel} 의심 감지`}</Text>
              <View style={styles.eventTimeRow}>
                <Clock size={13} color={colors.disabledText} />
                <Text style={styles.eventTime}>감지 시각: {alert.timestamp}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Skeletal Joint Playback Visualizer (정적 스냅샷, 애니메이션 없음) */}
        <View style={styles.replayCard}>
          <View style={styles.replayHeaderRow}>
            <View style={styles.replayHeaderLeft}>
              <View style={styles.replayLiveDot} />
              <Text style={styles.replayHeaderText}>SKELETAL JOINT PLAYBACK (RECORDED)</Text>
            </View>
            <Text style={styles.replayHeaderRight}>CAMERA_01_REPLAY</Text>
          </View>

          <View style={styles.replayBox}>
            <Svg width="100%" height="100%" viewBox="0 0 300 180" style={StyleSheet.absoluteFill}>
              {/* Spine / Limbs */}
              <Line x1={150} y1={72} x2={190} y2={100} stroke={colors.dangerBorderStrong} strokeWidth={2} />
              <Line x1={190} y1={100} x2={230} y2={115} stroke={colors.dangerBorderStrong} strokeWidth={2} />
              <Line x1={150} y1={72} x2={110} y2={90} stroke={colors.dangerBorderStrong} strokeWidth={2} />
              <Line x1={110} y1={90} x2={80} y2={110} stroke={colors.dangerBorderStrong} strokeWidth={2} />
              <Line x1={190} y1={100} x2={180} y2={150} stroke={colors.dangerBorderStrong} strokeWidth={2} />
              <Line x1={110} y1={90} x2={120} y2={145} stroke={colors.dangerBorderStrong} strokeWidth={2} />

              {/* Head */}
              <Circle cx={150} cy={48} r={12} stroke={colors.danger} strokeWidth={2} fill="rgba(229, 57, 53, 0.2)" />
              <Circle cx={150} cy={48} r={2} fill={colors.danger} />

              {/* Joints (정상: 노란색, 위험 지점: 빨간색) */}
              <Circle cx={150} cy={72} r={5} fill={colors.scoreGradientMid} stroke={colors.black} strokeWidth={1} />
              <Circle cx={190} cy={100} r={5} fill={colors.scoreGradientMid} stroke={colors.black} strokeWidth={1} />
              <Circle cx={110} cy={90} r={5} fill={colors.scoreGradientMid} stroke={colors.black} strokeWidth={1} />
              <Circle cx={230} cy={115} r={5} fill={colors.scoreGradientStart} stroke={colors.black} strokeWidth={1} />
            </Svg>

            <View style={styles.replayBadge}>
              <Text style={styles.replayBadgeText}>CRITICAL ACCELERATION: 4.8G</Text>
            </View>

            <Pressable
              onPress={handlePlayReplay}
              style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            >
              <Play size={18} color={colors.white} fill={colors.white} />
            </Pressable>
          </View>

          <Text style={styles.replayCaption}>
            실버비전 스마트 센서가 분석한 골반 낙상 지수 88% 위험도 초과
          </Text>
        </View>

        {/* Technical Analysis Report Detail Block */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Info size={16} color={colors.primary} />
            <Text style={styles.sectionHeaderText}>분석 타임라인</Text>
          </View>

          <View style={styles.timelineList}>
            {TIMELINE.map((item) => (
              <View key={item.id} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    item.dotColor === 'danger' && styles.timelineDotDanger,
                    item.dotColor === 'warn' && styles.timelineDotWarn,
                    item.dotColor === 'ok' && styles.timelineDotOk,
                  ]}
                />
                <Text style={styles.timelineText}>
                  <Text style={styles.timelineTime}>{item.time}</Text> - {item.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact/Action Details */}
        <View style={styles.card}>
          <Text style={styles.contactHeader}>안심 정보 및 연락망</Text>

          <View style={styles.contactRow}>
            <View style={styles.contactLabelRow}>
              <User size={14} color={colors.disabledText} />
              <Text style={styles.contactLabel}>피보호자 연락처</Text>
            </View>
            <Text style={styles.contactValue}>
              {alert.seniorName} 어르신 ({contactPhone})
            </Text>
          </View>
          <View style={styles.contactRow}>
            <View style={styles.contactLabelRow}>
              <MapPin size={14} color={colors.disabledText} />
              <Text style={styles.contactLabel}>등록된 자택 주소</Text>
            </View>
            <Text style={[styles.contactValue, styles.contactValueRight]}>{contactAddress}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons & Confirmation Status Update Bar */}
      <View style={styles.footer}>
        {alert.status === '미확인' ? (
          <View style={styles.footerRow}>
            <Pressable
              onPress={handleMarkFalsePositive}
              style={({ pressed }) => [styles.warnButton, pressed && styles.warnButtonPressed]}
            >
              <AlertTriangle size={18} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.warnButtonText}>오보(오탐) 처리</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [styles.okButton, pressed && styles.okButtonPressed]}
            >
              <CheckCircle2 size={18} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.okButtonText}>상황 확인 완료</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleReopen}
            style={({ pressed }) => [styles.reopenButton, pressed && styles.pressedOpacity]}
          >
            <Text style={styles.reopenButtonText}>알림 상태 &apos;미확인&apos;으로 재지정</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  notFoundButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundButtonText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerTitleLeft: {
    flex: 1,
  },
  title: {
    fontSize: guardianFontSizes.title - 2,
    fontWeight: fontWeights.black,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadgeUnconfirmed: {
    backgroundColor: colors.dangerBorder,
    borderWidth: 1,
    borderColor: colors.dangerBorderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusBadgeTextUnconfirmed: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.danger,
  },
  statusBadgeOk: {
    backgroundColor: colors.emeraldTextLight,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusBadgeTextOk: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  statusBadgeWarn: {
    backgroundColor: colors.amberCardBorder,
    borderWidth: 1,
    borderColor: colors.amberFill,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  statusBadgeTextWarn: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.amberTextDeep,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md + spacing.xs,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + spacing.xs,
  },
  eventIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.grayBadgeBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconWrapUnconfirmed: {
    backgroundColor: colors.dangerBackground,
  },
  eventInfo: {
    flex: 1,
  },
  eventOverline: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  eventTitle: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.text,
    marginTop: spacing.xs,
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventTime: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  replayCard: {
    backgroundColor: colors.cameraViewportDeep,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  replayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + spacing.xs,
  },
  replayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  replayLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.scoreGradientEnd,
  },
  replayHeaderText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.scoreGradientEnd,
  },
  replayHeaderRight: {
    fontSize: guardianFontSizes.tiny,
    fontWeight: fontWeights.medium,
    color: colors.border,
  },
  replayBox: {
    height: 180,
    backgroundColor: colors.cameraViewport,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  replayBadge: {
    position: 'absolute',
    bottom: spacing.sm + spacing.xs,
    left: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.2)',
    borderRadius: radius.md - 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  replayBadgeText: {
    fontSize: guardianFontSizes.tiny,
    fontWeight: fontWeights.bold,
    color: colors.dangerBorderStrong,
  },
  playButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(46, 125, 50, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonPressed: {
    backgroundColor: colors.primary,
  },
  replayCaption: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.border,
    textAlign: 'center',
    marginTop: spacing.sm + spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm + spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  timelineList: {
    gap: spacing.sm + spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  timelineDotDanger: {
    backgroundColor: colors.danger,
  },
  timelineDotWarn: {
    backgroundColor: colors.amberFill,
  },
  timelineDotOk: {
    backgroundColor: colors.primary,
  },
  timelineText: {
    flex: 1,
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  timelineTime: {
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  contactHeader: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.black,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm + spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  contactLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactLabel: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  contactValue: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  contactValueRight: {
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  warnButton: {
    flex: 1,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.amberFill,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  warnButtonPressed: {
    backgroundColor: colors.amberIcon,
  },
  warnButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  okButton: {
    flex: 1,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  okButtonPressed: {
    backgroundColor: '#1B5E20',
  },
  okButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  reopenButton: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.grayBadgeBackground,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenButtonText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
});
