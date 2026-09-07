// ============================================================
// build_features 이식 (fall_common.py:190-250)
//
// (T, 33, 4) 원시 랜드마크(정규화 0~1) -> (T, 53) 특징 시퀀스
//
// ⚠️ 표준화(mean/std)는 하지 않는다 — TFLite 모델 첫 레이어에 구워져 있다.
//    앱은 이 원시 특징을 그대로 모델에 넣는다.
// ============================================================
import { DT_S, JOINTS, N_FEATURES } from './constants';
import { bboxAspect, normalizePose, torsoAngle, type Vec2 } from './geometry';

/** numpy unwrap(discont=pi) 이식. torso_angvel 이 ±pi 에서 튀지 않도록. */
export function unwrap(p: number[]): number[] {
  const n = p.length;
  if (n < 2) return p.slice();
  const period = 2 * Math.PI;
  const half = Math.PI;
  const out = new Array(n);
  out[0] = p[0];
  let cum = 0;
  for (let i = 0; i < n - 1; i++) {
    const d = p[i + 1] - p[i];
    // ddmod = ((d + pi) mod 2pi) - pi  ∈ [-pi, pi)
    let ddmod = (((d + half) % period) + period) % period;
    ddmod -= half;
    if (ddmod === -half && d > 0) ddmod = half;
    let phCorrect = ddmod - d;
    if (Math.abs(d) < half) phCorrect = 0; // discont = pi
    cum += phCorrect;
    out[i + 1] = p[i + 1] + cum;
  }
  return out;
}

/** deriv: 초당 미분. d[1:]=(a[1:]-a[:-1])/DT_S, d[0]=d[1]. T<=1이면 0. */
function deriv1d(arr: number[]): number[] {
  const T = arr.length;
  const out = new Array(T).fill(0);
  if (T > 1) {
    for (let t = 1; t < T; t++) out[t] = (arr[t] - arr[t - 1]) / DT_S;
    out[0] = out[1];
  }
  return out;
}

/** deriv를 (T,9,2) 형태에 적용. */
function deriv3d(arr: Vec2[][]): Vec2[][] {
  const T = arr.length;
  const K = T > 0 ? arr[0].length : 0;
  const out: Vec2[][] = arr.map((f) => f.map(() => [0, 0] as Vec2));
  if (T > 1) {
    for (let t = 1; t < T; t++) {
      for (let k = 0; k < K; k++) {
        out[t][k][0] = (arr[t][k][0] - arr[t - 1][k][0]) / DT_S;
        out[t][k][1] = (arr[t][k][1] - arr[t - 1][k][1]) / DT_S;
      }
    }
    for (let k = 0; k < K; k++) {
      out[0][k][0] = out[1][k][0];
      out[0][k][1] = out[1][k][1];
    }
  }
  return out;
}

const fix = (v: number): number => (Number.isFinite(v) ? v : 0.0); // nan_to_num

/**
 * @param landmarks33 (T, 33, 4) — x, y, z, visibility (정규화 0~1)
 * @param detected    (T,) 0/1  — resample_to_grid 의 grid_det
 * @param width/height  MediaPipe 입력 이미지의 실효 크기(종횡비 보정용)
 * @returns (T, 53) number[][]  (float64 계산; 윈도우 슬라이스 시 Float32로 변환)
 */
export function buildFeatures(
  landmarks33: number[][][],
  detected: number[],
  width: number,
  height: number,
): number[][] {
  const T = landmarks33.length;
  const feats: number[][] = [];
  if (T === 0) return feats;

  const aspect = width / height; // aspect_correct: x_iso = x * (W/H)
  const NJ = JOINTS.length; // 9

  const normed: Vec2[][] = new Array(T);
  const vis: number[][] = new Array(T);
  const hipY = new Array(T).fill(0);
  const torsoLen = new Array(T).fill(0);
  const ang = new Array(T).fill(0);
  const bbox = new Array(T).fill(0);
  const ok = new Array(T).fill(false);

  for (let t = 0; t < T; t++) {
    const iso: Vec2[] = new Array(NJ);
    const visT: number[] = new Array(NJ);
    for (let k = 0; k < NJ; k++) {
      const j = JOINTS[k];
      const lm = landmarks33[t][j];
      iso[k] = [lm[0] * aspect, lm[1]];
      visT[k] = lm[3];
    }
    vis[t] = visT;

    const np = normalizePose(iso, visT);
    normed[t] = np.normed;
    hipY[t] = np.hipMid[1];
    torsoLen[t] = np.torsoLen;
    ang[t] = torsoAngle(iso, visT);
    bbox[t] = bboxAspect(iso, visT);
    ok[t] = np.ok && detected[t] === 1;
  }

  const vel = deriv3d(normed);
  const hipVy = deriv1d(hipY);
  const angvel = deriv1d(unwrap(ang));

  for (let t = 0; t < T; t++) {
    const row = new Array(N_FEATURES).fill(0);
    let k = 0;
    // 0..17 : normed (9관절 x,y 인터리브)
    for (let j = 0; j < NJ; j++) {
      row[k++] = fix(normed[t][j][0]);
      row[k++] = fix(normed[t][j][1]);
    }
    // 18..35 : velocity (vx,vy)
    for (let j = 0; j < NJ; j++) {
      row[k++] = fix(vel[t][j][0]);
      row[k++] = fix(vel[t][j][1]);
    }
    // 36..44 : visibility
    for (let j = 0; j < NJ; j++) row[k++] = fix(vis[t][j]);
    // 45..52 : 파생
    row[k++] = fix(Math.sin(ang[t])); // torso_sin
    row[k++] = fix(Math.cos(ang[t])); // torso_cos
    row[k++] = fix(angvel[t]); // torso_angvel
    row[k++] = fix(hipY[t]); // hip_y_frame
    row[k++] = fix(hipVy[t]); // hip_vy_frame
    row[k++] = fix(bbox[t]); // bbox_aspect
    row[k++] = fix(torsoLen[t]); // torso_len
    row[k++] = ok[t] ? 1.0 : 0.0; // detected
    feats.push(row);
  }

  return feats;
}
