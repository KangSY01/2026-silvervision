// ============================================================
// 낙상 확정(경보) 상태머신 — 앱 전용 판정 레이어
//
// eval_clips.py 의 "연속 N회 발화" 디바운스(find_runs)를 실시간용으로 옮긴 것.
//   idle      : 감시. 확률 < 임계값.
//   candidate : 확률 >= 임계값이 1회 (아직 미확정, 팝업 노랑).
//   fallen    : 연속 CONSECUTIVE_WINDOWS 회 임계값 이상 → 낙상 확정(팝업 빨강). sticky.
//               연속 RECOVER_WINDOWS 회 임계값 미만이면 idle 복귀(히스테리시스).
// ============================================================
import { CONSECUTIVE_WINDOWS, FALL_THRESHOLD, RECOVER_WINDOWS } from './constants';

export type FallPhase = 'idle' | 'candidate' | 'fallen';
export type DecisionState = {
  phase: FallPhase;
  consecutive: number; // 연속 임계값 이상 횟수
  prob: number;
};

export class FallDetector {
  private hi = 0; // 연속 임계값 이상
  private lo = 0; // 연속 임계값 미만
  private phase: FallPhase = 'idle';

  push(prob: number): DecisionState {
    if (prob >= FALL_THRESHOLD) {
      this.hi += 1;
      this.lo = 0;
    } else {
      this.lo += 1;
      this.hi = 0;
    }

    if (this.phase !== 'fallen') {
      if (this.hi >= CONSECUTIVE_WINDOWS) this.phase = 'fallen';
      else if (this.hi >= 1) this.phase = 'candidate';
      else this.phase = 'idle';
    } else if (this.lo >= RECOVER_WINDOWS) {
      this.phase = 'idle';
    }

    return { phase: this.phase, consecutive: this.hi, prob };
  }

  reset(): void {
    this.hi = 0;
    this.lo = 0;
    this.phase = 'idle';
  }

  get current(): FallPhase {
    return this.phase;
  }
}
