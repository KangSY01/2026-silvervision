// ============================================================
// 라이브 낙상 추론 파이프라인
//
// MediaPipe 결과 스트림 → 중복필터 → 100ms 격자 리샘플 → 53특징 →
// 마지막 20프레임 윈도우 → TFLite 추론 → 연속 판정.
//
// eval_clips.py 의 오프라인 경로(resample→build_features→stride-3 윈도우→모델)를
// 라이브용으로 옮긴 것. 특징은 연속 롤링 grid 버퍼 위에서 계산해 윈도우 경계의
// 속도가 이전 grid 프레임을 참조하도록 한다(학습과 동일).
// ============================================================
import { DT_MS, N_FEATURES, STRIDE_FRAMES, WINDOW_FRAMES } from './constants';
import { FallDetector, type DecisionState } from './decision';
import { buildFeatures } from './features';
import { resampleToGrid } from './resampler';

type Obs = { t: number; lms: number[][]; det: number }; // lms: 33x4

// 원시 관측 보관 시간: 윈도우(2.0s) + 여유(속도 lookback + stride). ~3.2s.
const BUFFER_MS = (WINDOW_FRAMES + 12) * DT_MS;

export type InferenceResult = DecisionState & { gridLen: number };

export type RunInference = (window: Float32Array) => number;

export class FallPipeline {
  private obs: Obs[] = [];
  private originMs: number | null = null;
  private lastTs = -Infinity; // 중복 결과 필터
  private lastInferTs = -Infinity; // stride 게이트
  private readonly detector = new FallDetector();

  constructor(private readonly runInference: RunInference) {}

  reset(): void {
    this.obs = [];
    this.originMs = null;
    this.lastTs = -Infinity;
    this.lastInferTs = -Infinity;
    this.detector.reset();
  }

  /**
   * @param lms 33x4 [x,y,z,visibility]. 사람 미검출이면 null.
   * @param timestampMs 결과 타임스탬프(좌표가 실제로 찍힌 시각). Date.now() 아님.
   * @param width/height MediaPipe 입력 이미지의 실효 크기(종횡비 보정).
   * @returns 이번 호출에서 추론이 일어났으면 결과, 아니면 null.
   */
  onFrame(
    lms: number[][] | null,
    timestampMs: number,
    width: number,
    height: number,
  ): InferenceResult | null {
    // 1) 중복 결과 필터: 같은/더 이전 타임스탬프는 버림.
    //    LIVE_STREAM이 밀리면 같은 좌표를 반복 반환 → 가장 빠른 순간에 속도 0으로
    //    찍히는 사고를 막는다.
    if (timestampMs <= this.lastTs) return null;
    this.lastTs = timestampMs;

    if (this.originMs === null) this.originMs = timestampMs;

    const detected = lms != null && lms.length === 33 ? 1 : 0;
    const frame: number[][] = detected
      ? (lms as number[][])
      : Array.from({ length: 33 }, () => [0, 0, 0, 0]);
    this.obs.push({ t: timestampMs, lms: frame, det: detected });

    // 2) 오래된 관측 정리
    const cutoff = timestampMs - BUFFER_MS;
    while (this.obs.length > 0 && this.obs[0].t < cutoff) this.obs.shift();

    // 3) stride 게이트: 마지막 추론에서 STRIDE*DT(=300ms) 이상 지났을 때만.
    if (timestampMs - this.lastInferTs < STRIDE_FRAMES * DT_MS) return null;

    // 4) 리샘플 → 특징 → 마지막 20프레임 윈도우
    const landmarks = this.obs.map((o) => o.lms);
    const tMs = this.obs.map((o) => o.t);
    const det = this.obs.map((o) => o.det);
    const grid = resampleToGrid(landmarks, tMs, det, this.originMs);
    if (grid.gridT.length < WINDOW_FRAMES) return null;

    const feats = buildFeatures(grid.gridLms, grid.gridDet, width, height);
    const start = feats.length - WINDOW_FRAMES;
    const win = new Float32Array(WINDOW_FRAMES * N_FEATURES);
    for (let i = 0; i < WINDOW_FRAMES; i++) {
      const row = feats[start + i];
      for (let f = 0; f < N_FEATURES; f++) win[i * N_FEATURES + f] = row[f];
    }

    this.lastInferTs = timestampMs;
    const prob = this.runInference(win);
    const state = this.detector.push(prob);
    return { ...state, gridLen: grid.gridT.length };
  }
}
