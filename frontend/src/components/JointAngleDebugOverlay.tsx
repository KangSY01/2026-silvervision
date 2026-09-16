import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontWeights, radius, spacing } from '../theme/theme';
import { JOINT_ANGLE_DEFS } from '@/pose/exercise';

// 관절 각도 디버그 표. ExerciseProgressScreen / PoseSmokeTestScreen이
// 카메라 프리뷰 위에 띄우며, ExercisePipeline.onFrame이 돌려주는 liveAngles/refAngles를
// JOINT_ANGLE_DEFS 순서 그대로 8행으로 보여준다.
//
// 열: 관절 | 현재(라이브) | 기준 | 차이 | 판정
//  - 기준이 null(비활성 관절)이면 "-"로 표시하고 판정도 비운다(매칭에서 무시되는 관절).
//  - 라이브가 null(visibility 부족)이면 현재/차이를 "?"로 표시 — matchesPose는 이 관절을
//    비교 불가로 세므로 activeJoints 전부 일치 조건을 채우지 못해 매칭이 안 된다.
//  - 차이가 toleranceDeg 이내면 ○, 넘으면 ✕. 색도 같이 바꿔 한눈에 보이게 한다.
//
// 판정 로직은 여기서 다시 계산하지 않는다 — 파이프라인이 쓰는 허용 오차(ExerciseState.
// angleToleranceDeg)를 받아 표기만 할 뿐, 실제 통과 여부는 파이프라인이 결정한다.
// 호출 측에서 디버그 모드(useAppMode().showDebug) 가드를 건다.

type Props = {
  liveAngles: (number | null)[] | null;
  refAngles: (number | null)[] | null;
  toleranceDeg: number;
  // 기본은 프리뷰 좌하단. 화면마다 다른 오버레이와 겹치면 위치만 덮어쓴다.
  style?: StyleProp<ViewStyle>;
};

function fmt(deg: number | null | undefined, fallback: string): string {
  return deg == null ? fallback : deg.toFixed(0);
}

export default function JointAngleDebugOverlay({
  liveAngles,
  refAngles,
  toleranceDeg,
  style,
}: Props) {
  return (
    <View pointerEvents="none" style={[styles.box, style]}>
      <View style={styles.row}>
        <Text style={[styles.cell, styles.nameCell, styles.header]}>관절</Text>
        <Text style={[styles.cell, styles.header]}>현재</Text>
        <Text style={[styles.cell, styles.header]}>기준</Text>
        <Text style={[styles.cell, styles.header]}>차이</Text>
        <Text style={[styles.cell, styles.markCell, styles.header]}>±{toleranceDeg}</Text>
      </View>
      {JOINT_ANGLE_DEFS.map((def, i) => {
        const live = liveAngles?.[i] ?? null;
        const ref = refAngles?.[i] ?? null;
        const active = ref != null;
        const diff = active && live != null ? Math.abs(live - ref) : null;
        const ok = diff != null ? diff <= toleranceDeg : null;
        const tone =
          !active ? styles.inactive : ok == null ? styles.unknown : ok ? styles.ok : styles.bad;
        return (
          <View key={def.name} style={styles.row}>
            <Text style={[styles.cell, styles.nameCell, tone]}>{def.name}</Text>
            <Text style={[styles.cell, tone]}>{fmt(live, '?')}</Text>
            <Text style={[styles.cell, tone]}>{fmt(ref, '-')}</Text>
            <Text style={[styles.cell, tone]}>{active ? fmt(diff, '?') : '-'}</Text>
            <Text style={[styles.cell, styles.markCell, tone]}>
              {!active ? '' : ok == null ? '?' : ok ? '○' : '✕'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    zIndex: 20,
    backgroundColor: colors.overlayDark,
    borderWidth: 1,
    borderColor: colors.overlayLightBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 40,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: fontWeights.bold,
    color: colors.white,
    textAlign: 'right',
  },
  nameCell: {
    width: 84,
    textAlign: 'left',
  },
  markCell: {
    width: 32,
    textAlign: 'center',
  },
  header: {
    opacity: 0.7,
  },
  inactive: {
    opacity: 0.35,
  },
  unknown: {
    color: colors.warningBorder,
  },
  ok: {
    color: colors.targetGreen,
  },
  bad: {
    color: colors.danger,
  },
});
