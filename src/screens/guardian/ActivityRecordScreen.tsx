import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import BackHeader from '../../components/BackHeader';
import ScreenContainer from '../../components/ScreenContainer';
import { mockMovementCompletion, mockWeeklyActivity } from '../../data/mockData';
import { RootStackParamList } from '../../navigation/types';
import { colors, fontSizes, radius, spacing } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityRecord'>;

const CHART_HEIGHT = 140;

function BarChart({
  data,
  maxValue,
  valueSuffix,
  barColor,
}: {
  data: { day: string; value: number }[];
  maxValue: number;
  valueSuffix: string;
  barColor: string;
}) {
  return (
    <View style={styles.chartRow}>
      {data.map((point) => {
        const height = Math.max(6, (point.value / maxValue) * CHART_HEIGHT);
        return (
          <View key={point.day} style={styles.barColumn}>
            <Text style={styles.barValue}>
              {point.value}
              {valueSuffix}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.barLabel}>{point.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ActivityRecordScreen({ route, navigation }: Props) {
  const { wardName } = route.params;

  const weeklyData = mockWeeklyActivity.map((p) => ({ day: p.day, value: p.count }));
  const completionData = mockMovementCompletion.map((p) => ({ day: p.day, value: p.percentage }));

  return (
    <ScreenContainer scroll>
      <BackHeader title={`${wardName}님 활동 기록`} onBack={() => navigation.goBack()} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>주간 활동 그래프</Text>
        <Text style={styles.sectionHelper}>하루 동안 완료한 운동 횟수</Text>
        <BarChart data={weeklyData} maxValue={5} valueSuffix="회" barColor={colors.primary} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>동작 완성도 그래프</Text>
        <Text style={styles.sectionHelper}>운동 동작을 얼마나 정확히 따라했는지</Text>
        <BarChart
          data={completionData}
          maxValue={100}
          valueSuffix="%"
          barColor={colors.secondary}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: '800',
    color: colors.text,
  },
  sectionHelper: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginTop: spacing.xs / 2,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: fontSizes.caption,
    color: colors.text,
    marginBottom: spacing.xs / 2,
    fontWeight: '700',
  },
  barTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
    fontWeight: '600',
  },
});