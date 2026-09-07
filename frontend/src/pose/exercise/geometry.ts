// ============================================================
// worldLandmarks(3D, 미터, hip 중심) 기반 관절 각도 계산
// ============================================================
import { JOINT_ANGLE_DEFS, MIN_VISIBILITY, NUM_JOINT_ANGLES } from './constants';

export type Vec3 = [number, number, number];

export type WorldLandmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

/** a -> vertex -> c 사이 각도(도). a, c가 vertex와 같은 점이면 0. */
export function angleAtVertex(a: Vec3, vertex: Vec3, c: Vec3): number {
  const u = sub(a, vertex);
  const v = sub(c, vertex);
  const un = norm(u);
  const vn = norm(v);
  if (un < 1e-9 || vn < 1e-9) return 0;
  const cos = Math.min(1, Math.max(-1, dot(u, v) / (un * vn)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * JOINT_ANGLE_DEFS 순서대로 관절 각도를 계산.
 * triplet 중 하나라도 visibility < MIN_VISIBILITY 면 해당 항목은 null(판정 불가).
 */
export function computeJointAngles(
  world: WorldLandmark[],
): (number | null)[] {
  const out: (number | null)[] = new Array(NUM_JOINT_ANGLES);
  for (let i = 0; i < JOINT_ANGLE_DEFS.length; i++) {
    const [ai, vi, ci] = JOINT_ANGLE_DEFS[i].triplet;
    const a = world[ai];
    const v = world[vi];
    const c = world[ci];
    if (
      a == null ||
      v == null ||
      c == null ||
      a.visibility < MIN_VISIBILITY ||
      v.visibility < MIN_VISIBILITY ||
      c.visibility < MIN_VISIBILITY
    ) {
      out[i] = null;
      continue;
    }
    out[i] = angleAtVertex([a.x, a.y, a.z], [v.x, v.y, v.z], [c.x, c.y, c.z]);
  }
  return out;
}
