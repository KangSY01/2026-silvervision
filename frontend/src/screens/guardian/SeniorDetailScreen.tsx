import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
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

// 오늘 수행 운동 mock 데이터
const TODAY_WORKOUTS = [
  { id: '1', name: '관절 스트레칭', time: '오전 09:15' },
  { id: '2', name: '무릎 관절 강화 운동', time: '오후 14:30' },
];

// 이상 감지 기록 mock 데이터
const EMERGENCY_LOGS: {
  id: string;
  message: string;
  timestamp: string;
  status: '확인됨' | '오탐' | '미확인';
}[] = [
  { id: 'e1', message: '낙상 의심 센서 감지', timestamp: '07/15 15:20', status: '확인됨' },
  {
    id: 'e2',
    message: '보폭 비대칭성 급증 감지 (거동 정지)',
    timestamp: '07/13 10:04',
    status: '오탐',
  },
  { id: 'e3', message: '장시간 미거동 경고 알림', timestamp: '07/10 18:45', status: '확인됨' },
];

// 주간 활동량(분) mock 데이터
const ACTIVITY_DATA = [
  { day: '월', min: 10 },
  { day: '화', min: 15 },
  { day: '수', min: 5 },
  { day: '목', min: 20 },
  { day: '금', min: 15 },
  { day: '토', min: 25 },
  { day: '일', min: 12 },
];

// 주간 동작 완성도(%) mock 데이터
const ACCURACY_DATA = [
  { day: '월', score: 72 },
  { day: '화', score: 75 },
  { day: '수', score: 80 },
  { day: '목', score: 78 },
  { day: '금', score: 85 },
  { day: '토', score: 92 },
  { day: '일', score: 88 },
];

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;
const CHART_BASELINE = 118;

function xForIndex(index: number, count: number) {
  const paddingX = 22;
  const usable = CHART_WIDTH - paddingX * 2;
  return paddingX + (usable / (count - 1)) * index;
}

export default function SeniorDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'SeniorDetail'>>();
  const { seniors } = useAppState();
  const [activeTab, setActiveTab] = useState<'activity' | 'accuracy'>('activity');

  const senior = seniors.find((item) => item.id === route.params.seniorId);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUnlink = () => {
    // TODO: 실제 연동 해제(seniors 배열에서 제거) 로직 및 확인 다이얼로그 연결
    console.log('[SeniorDetailScreen] unlink senior (미구현):', senior?.name);
  };

  if (!senior) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>피보호자 정보를 찾을 수 없습니다.</Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.notFoundButton, pressed && styles.pressedPrimary]}
        >
          <Text style={styles.notFoundButtonText}>목록으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const maxMinutes = 25;
  const targetAccuracyY = CHART_BASELINE - (80 / 100) * 100;

  const linePathD = ACCURACY_DATA.map((point, index) => {
    const x = xForIndex(index, ACCURACY_DATA.length);
    const y = CHART_BASELINE - (point.score / 100) * 100;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      {/* Header with Senior Profile Summary & Unlink Action */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedOpacity]}
          >
            <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.5} />
            <Text style={styles.backButtonText}>목록으로</Text>
          </Pressable>

          <Pressable
            onPress={handleUnlink}
            style={({ pressed }) => [styles.unlinkButton, pressed && styles.pressedOpacity]}
          >
            <Trash2 size={14} color={colors.disabledText} />
            <Text style={styles.unlinkButtonText}>기기 연동 해제</Text>
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{senior.avatarInitials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{senior.name} 어르신</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>보호 등급: 독립</Text>
              <Text style={styles.profileMetaDot}>•</Text>
              <Text style={styles.profileMetaMuted}>연동 ID: {senior.id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.healthBox}>
          <Text style={styles.healthText}>
            <Text style={styles.healthLabel}>주요 질환: </Text>
            {senior.diseases || '등록된 주요 질환 소견 없음'}
          </Text>
          <Text style={styles.healthText}>
            <Text style={styles.healthLabel}>안전 거주: </Text>
            {senior.address || '정보 없음'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Charts Section */}
        <View style={styles.card}>
          {/* Segmented Tab Controls */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setActiveTab('activity')}
              style={[styles.tabButton, activeTab === 'activity' && styles.tabButtonActive]}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'activity' && styles.tabButtonTextActive]}
              >
                주간 활동량 (분)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('accuracy')}
              style={[styles.tabButton, activeTab === 'accuracy' && styles.tabButtonActive]}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'accuracy' && styles.tabButtonTextActive]}
              >
                관절 동작 완성도 (%)
              </Text>
            </Pressable>
          </View>

          {activeTab === 'activity' ? (
            <View>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartHeaderLabel}>최근 7일간 운동 시간</Text>
                <View style={styles.chartHeaderRight}>
                  <TrendingUp size={13} color={colors.primary} />
                  <Text style={styles.chartHeaderRightText}>주간 누적: 94분</Text>
                </View>
              </View>

              <View style={styles.chartBox}>
                <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
                  <Line
                    x1={0}
                    y1={CHART_BASELINE - 25}
                    x2={CHART_WIDTH}
                    y2={CHART_BASELINE - 25}
                    stroke={colors.borderLight}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  <Line
                    x1={0}
                    y1={CHART_BASELINE - 50}
                    x2={CHART_WIDTH}
                    y2={CHART_BASELINE - 50}
                    stroke={colors.borderLight}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  <Line
                    x1={0}
                    y1={CHART_BASELINE - 75}
                    x2={CHART_WIDTH}
                    y2={CHART_BASELINE - 75}
                    stroke={colors.borderLight}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  {ACTIVITY_DATA.map((item, index) => {
                    const barWidth = 20;
                    const centerX = xForIndex(index, ACTIVITY_DATA.length);
                    const barHeight = Math.max(10, (item.min / maxMinutes) * 90);
                    const y = CHART_BASELINE - barHeight;
                    const fill = item.min > 15 ? colors.primary : 'rgba(46, 125, 50, 0.4)';
                    return (
                      <G key={item.day}>
                        <Rect
                          x={centerX - barWidth / 2}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          rx={4}
                          fill={fill}
                        />
                        <SvgText
                          x={centerX}
                          y={y - 6}
                          fontSize={10}
                          fontWeight="bold"
                          fill={colors.primary}
                          textAnchor="middle"
                        >
                          {item.min}분
                        </SvgText>
                        <SvgText
                          x={centerX}
                          y={CHART_HEIGHT - 6}
                          fontSize={11}
                          fontWeight="bold"
                          fill={colors.textSecondary}
                          textAnchor="middle"
                        >
                          {item.day}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartHeaderLabel}>동작 정확도 트렌드</Text>
                <Text style={styles.chartHeaderRightAmber}>안전 임계율 80% 달성</Text>
              </View>

              <View style={styles.chartBox}>
                <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
                  <Line
                    x1={0}
                    y1={targetAccuracyY}
                    x2={CHART_WIDTH}
                    y2={targetAccuracyY}
                    stroke={colors.amberFill}
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                  />
                  <SvgText
                    x={4}
                    y={targetAccuracyY - 6}
                    fontSize={9}
                    fontWeight="bold"
                    fill={colors.amberTextDeep}
                    textAnchor="start"
                  >
                    목표 완성도 80%
                  </SvgText>
                  <Path
                    d={linePathD}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {ACCURACY_DATA.map((item, index) => {
                    const x = xForIndex(index, ACCURACY_DATA.length);
                    const y = CHART_BASELINE - (item.score / 100) * 100;
                    return (
                      <G key={item.day}>
                        <Circle cx={x} cy={y} r={4} fill={colors.primary} />
                        <SvgText
                          x={x}
                          y={y - 10}
                          fontSize={9}
                          fontWeight="bold"
                          fill={colors.primary}
                          textAnchor="middle"
                        >
                          {item.score}%
                        </SvgText>
                        <SvgText
                          x={x}
                          y={CHART_HEIGHT - 6}
                          fontSize={11}
                          fontWeight="bold"
                          fill={colors.textSecondary}
                          textAnchor="middle"
                        >
                          {item.day}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </View>
          )}
        </View>

        {/* Today's Completed Exercises */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>오늘 수행 운동 내역</Text>
          </View>

          {TODAY_WORKOUTS.length > 0 ? (
            <View style={styles.workoutList}>
              {TODAY_WORKOUTS.map((workout) => (
                <View key={workout.id} style={styles.workoutItem}>
                  <View style={styles.workoutItemLeft}>
                    <CheckCircle size={18} color={colors.primary} />
                    <Text style={styles.workoutName}>{workout.name}</Text>
                  </View>
                  <View style={styles.workoutTimeRow}>
                    <Clock size={13} color={colors.disabledText} />
                    <Text style={styles.workoutTime}>{workout.time} 완료</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWorkoutBox}>
              <Text style={styles.emptyWorkoutText}>
                오늘 아직 완료된 치매 예방 운동이 존재하지 않습니다.
              </Text>
            </View>
          )}
        </View>

        {/* Incident Log Timeline */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <AlertOctagon size={16} color={colors.danger} />
            <Text style={styles.sectionTitle}>거동 안전 및 이상 감지 기록</Text>
          </View>

          <View style={styles.logList}>
            {EMERGENCY_LOGS.map((log) => {
              let badgeStyle = styles.logBadgeNeutral;
              let badgeTextStyle = styles.logBadgeTextNeutral;
              if (log.status === '오탐') {
                badgeStyle = styles.logBadgeInfo;
                badgeTextStyle = styles.logBadgeTextInfo;
              } else if (log.status === '확인됨') {
                badgeStyle = styles.logBadgeOk;
                badgeTextStyle = styles.logBadgeTextOk;
              }

              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logTopRow}>
                    <View style={styles.logMessageRow}>
                      <View style={styles.logDot} />
                      <Text style={styles.logMessage}>{log.message}</Text>
                    </View>
                    <View style={badgeStyle}>
                      <Text style={badgeTextStyle}>{log.status}</Text>
                    </View>
                  </View>
                  <View style={styles.logBottomRow}>
                    <Text style={styles.logBottomText}>원격 AI 감지 모듈</Text>
                    <Text style={styles.logBottomText}>{log.timestamp}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    padding: spacing.md + spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
  },
  backButtonText: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  unlinkButtonText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: guardianFontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: guardianFontSizes.title - 2,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  profileMeta: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  profileMetaDot: {
    fontSize: guardianFontSizes.badge,
    color: colors.border,
  },
  profileMetaMuted: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  healthBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.grayBadgeBackground,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
    gap: spacing.xs,
  },
  healthText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  healthLabel: {
    color: colors.disabledText,
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.md - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.disabledText,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chartHeaderLabel: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  chartHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartHeaderRightText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  chartHeaderRightAmber: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.black,
    color: colors.amberIcon,
  },
  chartBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm + spacing.xs,
  },
  sectionTitle: {
    fontSize: guardianFontSizes.label,
    fontWeight: fontWeights.black,
    color: colors.text,
  },
  workoutList: {
    gap: spacing.sm,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.grayBadgeBackground,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
  },
  workoutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workoutName: {
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.extrabold,
    color: colors.textMuted,
  },
  workoutTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  workoutTime: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  emptyWorkoutBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  emptyWorkoutText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
    textAlign: 'center',
  },
  logList: {
    gap: spacing.sm + spacing.xs,
  },
  logItem: {
    backgroundColor: 'rgba(254, 242, 242, 0.4)',
    borderWidth: 1,
    borderColor: colors.dangerBackground,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
    gap: spacing.xs,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  logMessage: {
    flex: 1,
    fontSize: guardianFontSizes.labelSmall,
    fontWeight: fontWeights.extrabold,
    color: colors.danger,
  },
  logBadgeNeutral: {
    backgroundColor: colors.grayBadgeBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  logBadgeTextNeutral: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.textMuted,
  },
  logBadgeInfo: {
    backgroundColor: colors.guardianInfoBackground,
    borderWidth: 1,
    borderColor: colors.guardianInfoBorder,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  logBadgeTextInfo: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.guardianInfoText,
  },
  logBadgeOk: {
    backgroundColor: colors.emeraldBackground,
    borderWidth: 1,
    borderColor: colors.emeraldBorderLight,
    borderRadius: radius.md - 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  logBadgeTextOk: {
    fontSize: guardianFontSizes.small,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  logBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  logBottomText: {
    fontSize: guardianFontSizes.badge,
    fontWeight: fontWeights.bold,
    color: colors.disabledText,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
});
