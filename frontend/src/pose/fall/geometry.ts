// ============================================================
// fall_common.py 기하 함수 이식 (lines 62~139)
//
// 모든 함수는 '한 프레임'의 9관절 등방(iso) 좌표에 대해 동작한다.
//   jointsIso: number[9][2]  — aspect_correct 적용된 (x_iso, y_iso)
//   vis:       number[9]     — visibility
// ============================================================
import { EPS, J_LHIP, J_LSH, J_RHIP, J_RSH, MIN_VISIBILITY } from './constants';

type Vec2 = [number, number];

function mid(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0];
}

function norm(a: Vec2): number {
  return Math.hypot(a[0], a[1]);
}

/**
 * normalize_pose (fall_common.py:77-111)
 * 엉덩이 중심 이동 + 몸통 길이로 스케일 정규화.
 * 반환: { normed(9x2), hipMid(2), torsoLen, ok }
 */
export function normalizePose(
  jointsIso: Vec2[],
  vis: number[],
): { normed: Vec2[]; hipMid: Vec2; torsoLen: number; ok: boolean } {
  const zeros = (): Vec2[] => jointsIso.map(() => [0, 0] as Vec2);

  const hipsOk = vis[J_LHIP] >= MIN_VISIBILITY && vis[J_RHIP] >= MIN_VISIBILITY;
  const shOk = vis[J_LSH] >= MIN_VISIBILITY && vis[J_RSH] >= MIN_VISIBILITY;

  let hipMid: Vec2;
  if (hipsOk) {
    hipMid = mid(jointsIso[J_LHIP], jointsIso[J_RHIP]);
  } else if (shOk) {
    // 하반신이 프레임 밖으로 나간 경우: 어깨 기준으로 폴백
    hipMid = mid(jointsIso[J_LSH], jointsIso[J_RSH]);
  } else {
    return { normed: zeros(), hipMid: [0, 0], torsoLen: 0.0, ok: false };
  }

  const shMid: Vec2 = shOk ? mid(jointsIso[J_LSH], jointsIso[J_RSH]) : hipMid;

  let torsoLen = norm([shMid[0] - hipMid[0], shMid[1] - hipMid[1]]);
  if (torsoLen < EPS) {
    // 몸통을 못 재면 어깨 너비로 대체
    if (shOk) {
      torsoLen =
        norm([
          jointsIso[J_LSH][0] - jointsIso[J_RSH][0],
          jointsIso[J_LSH][1] - jointsIso[J_RSH][1],
        ]) * 1.5;
    }
    if (torsoLen < EPS) {
      return { normed: zeros(), hipMid, torsoLen: 0.0, ok: false };
    }
  }

  const normed: Vec2[] = jointsIso.map(
    (j) => [(j[0] - hipMid[0]) / torsoLen, (j[1] - hipMid[1]) / torsoLen] as Vec2,
  );
  return { normed, hipMid, torsoLen, ok: true };
}

/**
 * torso_angle (fall_common.py:114-126)
 * 몸통이 수직에서 벗어난 각도(라디안). 서면 0, 누우면 ±pi/2.
 * 이미지 좌표는 y가 아래로 증가하므로 위쪽은 -y.
 */
export function torsoAngle(jointsIso: Vec2[], vis: number[]): number {
  if (
    vis[J_LSH] < MIN_VISIBILITY ||
    vis[J_RSH] < MIN_VISIBILITY ||
    vis[J_LHIP] < MIN_VISIBILITY ||
    vis[J_RHIP] < MIN_VISIBILITY
  ) {
    return 0.0;
  }
  const sh = mid(jointsIso[J_LSH], jointsIso[J_RSH]);
  const hip = mid(jointsIso[J_LHIP], jointsIso[J_RHIP]);
  const v: Vec2 = [sh[0] - hip[0], sh[1] - hip[1]]; // 엉덩이 -> 어깨
  return Math.atan2(v[0], -v[1]);
}

/**
 * bbox_aspect (fall_common.py:129-139)
 * 사람을 감싸는 상자의 가로/세로. 서면 작고 누우면 커진다.
 */
export function bboxAspect(jointsIso: Vec2[], vis: number[]): number {
  const idx: number[] = [];
  for (let i = 0; i < vis.length; i++) if (vis[i] >= MIN_VISIBILITY) idx.push(i);
  if (idx.length < 3) return 0.0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const i of idx) {
    const [x, y] = jointsIso[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (h < EPS) return 0.0;
  return w / h;
}

export type { Vec2 };
