// ============================================================
// 라이브 관절 각도 vs 기준 관절 각도 매칭 판정
// ============================================================
import { ANGLE_TOLERANCE_DEG } from './constants';

/**
 * 두 각도 배열(같은 순서, null=판정 불가/비활성 관절)을 비교한다.
 * 비교 가능한(둘 다 null이 아닌) 항목이 minVisibleJoints 이상이고,
 * 그 항목들이 전부 ANGLE_TOLERANCE_DEG 이내여야 매칭으로 본다.
 *
 * refAngles는 포즈별로 활성화된 관절만 값을 갖고 나머지는 null로 마스킹되어 들어오므로
 * (reference-poses.ts의 WORKOUT_MATCH_TARGETS), minVisibleJoints를 그 포즈의 활성 관절
 * 개수로 넘기면 "지정 관절 전부 일치"를 의미하게 된다.
 */
export function matchesPose(
  liveAngles: (number | null)[],
  refAngles: (number | null)[],
  minVisibleJoints: number,
): boolean {
  let comparable = 0;
  for (let i = 0; i < refAngles.length; i++) {
    const live = liveAngles[i];
    const ref = refAngles[i];
    if (live == null || ref == null) continue;
    comparable++;
    if (Math.abs(live - ref) > ANGLE_TOLERANCE_DEG) return false;
  }
  return comparable >= minVisibleJoints;
}
