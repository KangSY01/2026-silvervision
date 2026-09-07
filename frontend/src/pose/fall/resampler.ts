// ============================================================
// resample_to_grid 이식 (fall_common.py:144-187)
//
// 실제 타임스탬프를 100ms 고정 격자로 선형 보간한다.
// 앱의 프레임 드롭/지터와 학습 데이터를 같은 형태로 맞추기 위함.
//
// 순수 함수 — 골든 테스트(전체 클립)와 라이브 파이프라인(롤링 버퍼) 양쪽에서
// 동일하게 사용한다. originMs 를 넘기면 격자 위상을 세션 고정 원점에 맞출 수 있고,
// 생략하면 Python 과 동일하게 첫 샘플(t_ms[0])을 원점으로 쓴다(골든 파리티).
// ============================================================
import { DT_MS, MAX_GAP_FRAMES } from './constants';

export type GridResult = {
  gridLms: number[][][]; // (n, J, C)
  gridT: number[]; // (n,)
  gridDet: number[]; // (n,) 0/1
};

/** np.interp 1점 계산: xp 오름차순, 범위 밖은 끝값으로 클램프. */
function interpAt(x: number, xp: number[], fp: number[]): number {
  const n = xp.length;
  if (n === 0) return 0;
  if (x <= xp[0]) return fp[0];
  if (x >= xp[n - 1]) return fp[n - 1];
  // 이진 탐색: xp[lo] <= x < xp[hi]
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const midIdx = (lo + hi) >> 1;
    if (xp[midIdx] <= x) lo = midIdx;
    else hi = midIdx;
  }
  const t = (x - xp[lo]) / (xp[hi] - xp[lo]);
  return fp[lo] + t * (fp[hi] - fp[lo]);
}

/** g 에 가장 가까운 src_t 까지의 거리(정렬 배열 기준). */
function nearestGap(g: number, srcT: number[]): number {
  const n = srcT.length;
  if (n === 0) return Infinity;
  if (g <= srcT[0]) return srcT[0] - g;
  if (g >= srcT[n - 1]) return g - srcT[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const midIdx = (lo + hi) >> 1;
    if (srcT[midIdx] <= g) lo = midIdx;
    else hi = midIdx;
  }
  return Math.min(g - srcT[lo], srcT[hi] - g);
}

/**
 * @param landmarks (T, J, C)
 * @param tMs       (T,)  단조 증가
 * @param detected  (T,)  0/1 — 검출된 프레임만 보간 소스로 사용
 * @param originMs  격자 원점(생략 시 tMs[0])
 */
export function resampleToGrid(
  landmarks: number[][][],
  tMs: number[],
  detected: number[],
  originMs?: number,
): GridResult {
  const T = tMs.length;
  if (T === 0) return { gridLms: [], gridT: [], gridDet: [] };

  const J = landmarks[0].length;
  const C = landmarks[0][0].length;

  const tFirst = tMs[0];
  const tLast = tMs[T - 1];
  const origin = originMs ?? tFirst;

  // 격자 인덱스 범위: origin + k*dt 가 [tFirst, tLast] 를 덮도록.
  // origin == tFirst 이면 kStart=0, kEnd=floor((tLast-tFirst)/dt) → Python 과 동일.
  const kStart = Math.max(0, Math.ceil((tFirst - origin) / DT_MS));
  const kEnd = Math.floor((tLast - origin) / DT_MS);
  const n = kEnd - kStart + 1;
  if (n <= 0) return { gridLms: [], gridT: [], gridDet: [] };

  const gridT: number[] = new Array(n);
  for (let i = 0; i < n; i++) gridT[i] = origin + (kStart + i) * DT_MS;

  // detected 인덱스만 보간 소스
  const okIdx: number[] = [];
  for (let i = 0; i < T; i++) if (detected[i]) okIdx.push(i);

  const gridLms: number[][][] = new Array(n);
  for (let i = 0; i < n; i++) {
    gridLms[i] = new Array(J);
    for (let j = 0; j < J; j++) gridLms[i][j] = new Array(C).fill(0);
  }

  if (okIdx.length === 0) {
    return { gridLms, gridT, gridDet: new Array(n).fill(0) };
  }

  const srcT = okIdx.map((i) => tMs[i]);

  // 채널별 보간 (Python: 관절 j, 채널 c 마다 np.interp)
  for (let j = 0; j < J; j++) {
    for (let c = 0; c < C; c++) {
      const fp = okIdx.map((i) => landmarks[i][j][c]);
      for (let i = 0; i < n; i++) {
        gridLms[i][j][c] = interpAt(gridT[i], srcT, fp);
      }
    }
  }

  // grid_det: 가장 가까운 실제 검출이 dt*(MAX_GAP+0.5)=250ms 이내일 때만 1
  const thresh = DT_MS * (MAX_GAP_FRAMES + 0.5);
  const gridDet: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    gridDet[i] = nearestGap(gridT[i], srcT) <= thresh ? 1 : 0;
  }

  return { gridLms, gridT, gridDet };
}
