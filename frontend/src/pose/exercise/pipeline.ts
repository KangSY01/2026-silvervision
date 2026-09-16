// ============================================================
// 운동(포즈 시퀀스) 상태 머신
//
// FallPipeline과 달리 CNN/리샘플링이 필요 없다 — 프레임마다 관절 각도를
// 계산해 현재 타깃 포즈와 비교하고, 매칭되면 홀드 타이머를 굴리는 것뿐.
// 타이밍은 호출자가 넘기는 nowMs(Date.now()) 기준 — 10fps 처리 주기와 무관.
//
// 시퀀스/홀드 시간/판정할 관절은 워크아웃(운동)마다, 그리고 튜닝 프로필마다 다르므로
// 생성 시 받은 workoutKey와 tuning으로 해당 운동의 단계 목록을 만들어 사용한다.
// ============================================================
import {
  STRICT_EXERCISE_TUNING,
  type ExerciseTuning,
  type PoseName,
  type WorkoutKey,
} from './constants';
import { computeJointAngles, type WorldLandmark } from './geometry';
import { matchesPose } from './matcher';
import { buildMatchTargets, type PoseMatchTarget } from './reference-poses';

export type ExerciseStatus = 'idle' | 'running' | 'complete';

export type ExerciseState = {
  status: ExerciseStatus;
  stepIndex: number; // 현재 워크아웃 시퀀스 안에서의 위치(러닝 중에만 의미 있음)
  totalSteps: number;
  targetPoseName: PoseName | null;
  holdElapsedMs: number; // 현재 타깃을 매칭한 채로 유지한 시간(ms). 안 맞으면 0.
  holdMs: number; // 현재 타깃 단계의 홀드 기준 시간(ms) — UI 카운트다운용
  // 디버그 표시용 — JOINT_ANGLE_DEFS 순서의 8개 관절 각도(도).
  // liveAngles: 이번 프레임에서 계산한 라이브 각도. 사람 미검출이면 null, 관절별로
  //             visibility 부족이면 해당 슬롯만 null.
  // refAngles : 현재 타깃 단계의 기준 각도(activeJoints 외 슬롯은 null 마스킹).
  //             러닝 중이 아니면 null.
  // 판정 자체는 matchesPose가 이미 끝냈으므로 이 값은 화면 표기 외 용도로 쓰지 않는다.
  liveAngles: (number | null)[] | null;
  refAngles: (number | null)[] | null;
  angleToleranceDeg: number; // 이 파이프라인이 쓰는 허용 오차 — 디버그 표의 판정 기준 표기용
};

export class ExercisePipeline {
  private readonly steps: PoseMatchTarget[];
  private readonly tuning: ExerciseTuning;
  private status: ExerciseStatus = 'idle';
  private stepIndex = 0;
  private holdStartedAt: number | null = null;
  // 마지막으로 매칭됐던 시각 — 이걸로 "얼마나 오래 안 맞았는지"를 재서 유예를 준다.
  private lastMatchedAt: number | null = null;

  constructor(workoutKey: WorkoutKey, tuning: ExerciseTuning = STRICT_EXERCISE_TUNING) {
    this.tuning = tuning;
    this.steps = buildMatchTargets(tuning.sequences[workoutKey]);
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
      liveAngles: null,
      refAngles: target?.refAngles ?? null,
      angleToleranceDeg: this.tuning.angleToleranceDeg,
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
      liveAngles != null &&
      matchesPose(
        liveAngles,
        target.refAngles,
        target.minVisibleJoints,
        this.tuning.angleToleranceDeg,
      );

    if (matched) {
      this.lastMatchedAt = nowMs;
      if (this.holdStartedAt == null) this.holdStartedAt = nowMs;
    } else if (this.holdStartedAt != null) {
      // 노이즈로 잠깐 끊긴 것일 수 있으니 유예 시간(이 단계 holdMs의 graceRatio만큼) 안에
      // 다시 맞으면 봐준다. 유예를 넘겨야 이번 스텝의 홀드 타이머를 리셋
      // — 전체 진행(stepIndex)은 항상 유지.
      const graceMs = target.holdMs * this.tuning.graceRatio;
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
      liveAngles,
      // 단계가 막 넘어간 프레임이면 다음 타깃의 기준 각도를 싣는다 — 화면이 보여줄
      // "지금 맞춰야 할 자세"와 일치시키기 위함.
      refAngles: nextTarget?.refAngles ?? null,
      angleToleranceDeg: this.tuning.angleToleranceDeg,
    };
  }
}
