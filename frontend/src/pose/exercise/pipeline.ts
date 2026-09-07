// ============================================================
// 운동(포즈 시퀀스) 상태 머신
//
// FallPipeline과 달리 CNN/리샘플링이 필요 없다 — 프레임마다 관절 각도를
// 계산해 현재 타깃 포즈와 비교하고, 매칭되면 홀드 타이머를 굴리는 것뿐.
// 타이밍은 호출자가 넘기는 nowMs(Date.now()) 기준 — 10fps 처리 주기와 무관.
//
// 시퀀스/홀드 시간/판정할 관절은 워크아웃(운동)마다 다르므로, 생성 시 받은
// workoutKey로 WORKOUT_MATCH_TARGETS에서 해당 운동의 단계 목록을 조회해 사용한다.
// ============================================================
import { GRACE_RATIO, type PoseName, type WorkoutKey } from './constants';
import { computeJointAngles, type WorldLandmark } from './geometry';
import { matchesPose } from './matcher';
import { WORKOUT_MATCH_TARGETS } from './reference-poses';

export type ExerciseStatus = 'idle' | 'running' | 'complete';

export type ExerciseState = {
  status: ExerciseStatus;
  stepIndex: number; // 현재 워크아웃 시퀀스 안에서의 위치(러닝 중에만 의미 있음)
  totalSteps: number;
  targetPoseName: PoseName | null;
  holdElapsedMs: number; // 현재 타깃을 매칭한 채로 유지한 시간(ms). 안 맞으면 0.
  holdMs: number; // 현재 타깃 단계의 홀드 기준 시간(ms) — UI 카운트다운용
};

export class ExercisePipeline {
  private readonly steps: (typeof WORKOUT_MATCH_TARGETS)[WorkoutKey];
  private status: ExerciseStatus = 'idle';
  private stepIndex = 0;
  private holdStartedAt: number | null = null;
  // 마지막으로 매칭됐던 시각 — 이걸로 "얼마나 오래 안 맞았는지"를 재서 유예를 준다.
  private lastMatchedAt: number | null = null;

  constructor(workoutKey: WorkoutKey) {
    this.steps = WORKOUT_MATCH_TARGETS[workoutKey];
  }

  start(): void {
    this.status = 'running';
    this.stepIndex = 0;
    this.holdStartedAt = null;
    this.lastMatchedAt = null;
  }

  reset(): void {
    this.status = 'idle';
    this.stepIndex = 0;
    this.holdStartedAt = null;
    this.lastMatchedAt = null;
  }

  getState(): ExerciseState {
    const target = this.status === 'running' ? this.steps[this.stepIndex] : null;
    return {
      status: this.status,
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      targetPoseName: target?.poseName ?? null,
      holdElapsedMs: 0,
      holdMs: target?.holdMs ?? this.steps[0].holdMs,
    };
  }

  /**
   * @param worldLandmarks 33개 world landmark. 사람 미검출이면 null.
   * @param nowMs Date.now() 등 벽시계 시각.
   */
  onFrame(
    worldLandmarks: WorldLandmark[] | null,
    nowMs: number,
  ): ExerciseState {
    if (this.status !== 'running') return this.getState();

    const target = this.steps[this.stepIndex];
    const liveAngles =
      worldLandmarks != null && worldLandmarks.length === 33
        ? computeJointAngles(worldLandmarks)
        : null;
    const matched =
      liveAngles != null && matchesPose(liveAngles, target.refAngles, target.minVisibleJoints);

    if (matched) {
      this.lastMatchedAt = nowMs;
      if (this.holdStartedAt == null) this.holdStartedAt = nowMs;
    } else if (this.holdStartedAt != null) {
      // 노이즈로 잠깐 끊긴 것일 수 있으니 유예 시간(이 단계 holdMs의 GRACE_RATIO만큼) 안에
      // 다시 맞으면 봐준다. 유예를 넘겨야 이번 스텝의 홀드 타이머를 리셋
      // — 전체 진행(stepIndex)은 항상 유지.
      const graceMs = target.holdMs * GRACE_RATIO;
      const sinceMatched = nowMs - (this.lastMatchedAt ?? nowMs);
      if (sinceMatched > graceMs) {
        this.holdStartedAt = null;
        this.lastMatchedAt = null;
      }
    }

    let holdElapsedMs = 0;
    if (this.holdStartedAt != null) {
      holdElapsedMs = nowMs - this.holdStartedAt;
      if (holdElapsedMs >= target.holdMs) {
        this.stepIndex += 1;
        this.holdStartedAt = null;
        this.lastMatchedAt = null;
        holdElapsedMs = 0;
        if (this.stepIndex >= this.steps.length) {
          this.status = 'complete';
        }
      }
    }

    const nextTarget = this.status === 'running' ? this.steps[this.stepIndex] : null;
    return {
      status: this.status,
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      targetPoseName: nextTarget?.poseName ?? null,
      holdElapsedMs,
      holdMs: nextTarget?.holdMs ?? target.holdMs,
    };
  }
}
