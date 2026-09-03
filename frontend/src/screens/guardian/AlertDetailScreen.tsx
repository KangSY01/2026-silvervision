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
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import {
  apiClient,
  EmergencyEventDetailResponse,
  getApiErrorMessage,
  getSession,
  GuardianSeniorMapResponse,
  MappedSeniorResponse,
} from '../../api/client';
import { RootStackParamList } from '../../navigation/types';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../../theme/theme';
import {
  canResolveAlert,
  EMERGENCY_STATUS_LABELS,
  EMERGENCY_TYPE_LABELS,
  formatEmergencyTimestamp,
  isAlertClosed,
} from './emergency';

// 비전팀이 실제 센서/영상 데이터를 넣을 자리. 이번 배치에서는 목업 그대로 둔다.
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

type LoadState = 'loading' | 'ready' | 'error';

export default function AlertDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AlertDetail'>>();
  const { eventId } = route.params;

  const [detail, setDetail] = useState<EmergencyEventDetailResponse | null>(null);
  const [seniorInfo, setSeniorInfo] = useState<MappedSeniorResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 상세(GET /emergency/{id}/)와 매핑 목록(GET /guardian/{id}/seniors/)을 함께
  // 불러온다 - EmergencyEventSerializer.senior가 PK만 주고 이름/연락처가
  // nested되지 않아, 매핑 목록의 senior 요약에서 senior_id로 맞춘다.
  const load = useCallback(async () => {
    setLoadState((prev) => (prev === 'ready' ? prev : 'loading'));
    try {
      const session = await getSession();
      if (!session) {
        setLoadState('error');
        return;
      }
      const [detailRes, mappings] = await Promise.all([
        apiClient.get<EmergencyEventDetailResponse>(`/emergency/${eventId}/`),
        apiClient.get<GuardianSeniorMapResponse[]>(`/guardian/${session.userId}/seniors/`),
      ]);
      setDetail(detailRes);
      setSeniorInfo(
        mappings.find((m) => m.senior.senior_id === detailRes.senior)?.senior ?? null,
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePlayReplay = () => {
    // TODO: 실제 리플레이 영상 재생 기능 연결 (영상 데이터 없음)
    console.log('[AlertDetailScreen] play skeletal replay (미구현)');
  };

  // 보호자가 수행 가능한 유일한 상태 전이(→resolved). "오보 처리"·"미확인으로
  // 재지정"은 백엔드 전이표에 없어 버튼 자체를 두지 않는다(emergency.ts 주석 참고).
  const handleResolve = async () => {
    if (!detail || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const session = await getSession();
      if (!session) {
        setActionError('세션이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }
      await apiClient.patch(`/emergency/${detail.event_id}/`, { status: 'resolved' });
      await load();
    } catch (err) {
      setActionError(
        getApiErrorMessage(err, '상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>알림 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (loadState === 'error' || !detail) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>알림 정보를 불러오지 못했습니다.</Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.notFoundButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.notFoundButtonText}>목록으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const open = !isAlertClosed(detail.status);
  const seniorName = seniorInfo?.name ?? `어르신 #${detail.senior}`;
  const typeLabel = EMERGENCY_TYPE_LABELS[detail.event_type];

  let statusBadgeStyle = styles.statusBadgeUnconfirmed;
  let statusBadgeTextStyle = styles.statusBadgeTextUnconfirmed;
  if (detail.status === 'resolved') {
    statusBadgeStyle = styles.statusBadgeOk;
    statusBadgeTextStyle = styles.statusBadgeTextOk;
  } else if (detail.status === 'false_alarm') {
    statusBadgeStyle = styles.statusBadgeWarn;
    statusBadgeTextStyle = styles.statusBadgeTextWarn;
  }

  const latestNotification = detail.notifications[detail.notifications.length - 1];

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
            <Text style={styles.subtitle}>{seniorName} 어르신 스마트 관절 분석 데이터</Text>
          </View>
          <View style={statusBadgeStyle}>
            <Text style={statusBadgeTextStyle}>{EMERGENCY_STATUS_LABELS[detail.status]}</Text>
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
            <View style={[styles.eventIconWrap, open && styles.eventIconWrapUnconfirmed]}>
              <AlertTriangle size={22} color={colors.danger} strokeWidth={2} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventOverline}>발생 경보</Text>
              <Text style={styles.eventTitle}>{typeLabel} 의심 감지</Text>
              <Text style={styles.detectionSource}>감지 출처: {detail.detection_source}</Text>
              <View style={styles.eventTimeRow}>
                <Clock size={13} color={colors.disabledText} />
                <Text style={styles.eventTime}>
                  감지 시각: {formatEmergencyTimestamp(detail.created_at)}
                </Text>
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

        {/* Contact / Response History */}
        <View style={styles.card}>
          <Text style={styles.contactHeader}>안심 정보 및 대응 이력</Text>

          <View style={styles.contactRow}>
            <View style={styles.contactLabelRow}>
              <User size={14} color={colors.disabledText} />
              <Text style={styles.contactLabel}>피보호자 연락처</Text>
            </View>
            <Text style={[styles.contactValue, styles.contactValueRight]}>
              {seniorName} 어르신 ({seniorInfo?.phone ?? '정보 없음'})
            </Text>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactLabelRow}>
              <MapPin size={14} color={colors.disabledText} />
              <Text style={styles.contactLabel}>보호자 알림 발송</Text>
            </View>
            <Text style={[styles.contactValue, styles.contactValueRight]}>
              {detail.notifications.length > 0
                ? `${detail.notifications.length}건` +
                  (latestNotification
                    ? ` (최근 ${formatEmergencyTimestamp(latestNotification.sent_at)})`
                    : '')
                : '발송 이력 없음'}
            </Text>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactLabelRow}>
              <Info size={14} color={colors.disabledText} />
              <Text style={styles.contactLabel}>카메라 접근 허용</Text>
            </View>
            <Text style={[styles.contactValue, styles.contactValueRight]}>
              {detail.camera_grants.length > 0
                ? `${detail.camera_grants.length}건`
                : '허용 이력 없음'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar — 보호자가 할 수 있는 동작은 "상황 확인 완료"(→resolved) 하나 */}
      <View style={styles.footer}>
        {actionError ? <Text style={styles.actionErrorText}>⚠️ {actionError}</Text> : null}

        {detail.status === 'resolved' ? (
          <View style={styles.resolvedBanner}>
            <CheckCircle2 size={18} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.resolvedBannerText}>이 알림은 종결 처리되었습니다</Text>
          </View>
        ) : canResolveAlert(detail.status) ? (
          <Pressable
            onPress={handleResolve}
            disabled={submitting}
            style={({ pressed }) => [
              styles.okButton,
              pressed && styles.okButtonPressed,
              submitting && styles.okButtonDisabled,
            ]}
          >
            <CheckCircle2 size={18} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.okButtonText}>
              {submitting ? '처리 중...' : '상황 확인 완료'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.actionInfoBox}>
            <Text style={styles.actionInfoText}>
              현재 대응이 진행 중인 알림입니다. 상태가 갱신되면 확인 완료 처리를 할 수 있습니다.
            </Text>
          </View>
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
  detectionSource: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
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
    gap: spacing.sm,
  },
  actionErrorText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.danger,
  },
  okButton: {
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
  okButtonDisabled: {
    opacity: 0.6,
  },
  okButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  resolvedBanner: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  resolvedBannerText: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  actionInfoBox: {
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    backgroundColor: colors.grayBadgeBackground,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionInfoText: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
});
