// ============================================================
// 운동(포즈 시퀀스) 기능 — 설정 상수
// ============================================================

// MediaPipe Pose 33개 랜드마크 중 이 기능이 쓰는 관절 인덱스.
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;

/**
 * 비교할 관절 각도 정의: [a, vertex, c] — vertex를 꼭짓점으로 a→vertex→c 사이 각도.
 * 팔 자세뿐 아니라 향후 다른 운동(스쿼트 등)에도 재사용할 수 있도록 상/하체를
 * 모두 포함한다.
 */
export const JOINT_ANGLE_DEFS = [
  { name: 'l_elbow', triplet: [L_SHOULDER, L_ELBOW, L_WRIST] },
  { name: 'r_elbow', triplet: [R_SHOULDER, R_ELBOW, R_WRIST] },
  { name: 'l_shoulder', triplet: [L_HIP, L_SHOULDER, L_ELBOW] },
  { name: 'r_shoulder', triplet: [R_HIP, R_SHOULDER, R_ELBOW] },
  { name: 'l_hip', triplet: [L_SHOULDER, L_HIP, L_KNEE] },
  { name: 'r_hip', triplet: [R_SHOULDER, R_HIP, R_KNEE] },
  { name: 'l_knee', triplet: [L_HIP, L_KNEE, L_ANKLE] },
  { name: 'r_knee', triplet: [R_HIP, R_KNEE, R_ANKLE] },
] as const;

export const NUM_JOINT_ANGLES = JOINT_ANGLE_DEFS.length; // 8

export type JointAngleName = (typeof JOINT_ANGLE_DEFS)[number]['name'];

// 랜드마크 visibility 최저 기준 — 이 미만이면 해당 관절 각도는 "판정 불가"(null).
// fall/constants.ts의 MIN_VISIBILITY(0.3)와 다르게 맞춤 — 카메라 각도/조명에 따라
// 관절이 살짝만 가려져도 통째로 빠지는 일이 잦아 더 낮춰서 관대하게 판정한다.
export const MIN_VISIBILITY = 0.2;

// ============================================================
// 신체 부위 그룹 — 좌우 미표기 관절 이름은 항상 양쪽(l_/r_) 다 포함한다.
// ============================================================
const HIP: JointAngleName[] = ['l_hip', 'r_hip'];
const KNEE: JointAngleName[] = ['l_knee', 'r_knee'];
const SHOULDER: JointAngleName[] = ['l_shoulder', 'r_shoulder'];
const ELBOW: JointAngleName[] = ['l_elbow', 'r_elbow'];
const FULL_BODY: JointAngleName[] = JOINT_ANGLE_DEFS.map((d) => d.name);
// 하체 운동(무릎/균형)용 — 팔꿈치는 자세와 무관하게 흔들려 매칭만 방해하므로 뺀다.
const BODY_WITHOUT_ELBOW: JointAngleName[] = [...HIP, ...KNEE, ...SHOULDER];

// ============================================================
// 포즈(운동 단계) 이름 — frontend/assets/poses/*.json 파일명과 1:1 대응.
// output_new_exercises(MediaPipe 원본)를 frontend/scripts/convert-pose-json.mjs로
// 변환한 결과이며, 소스 basename을 그대로 재사용해 추적성을 유지한다.
// ============================================================
export type PoseName =
  | 'stretching1'
  | 'stretching2'
  | 'stretching3'
  | 'upper_body1'
  | 'upper_body2'
  | 'upper_body3'
  | 'upper_body4'
  | 'upper_body5'
  | 'knee1'
  | 'knee2'
  | 'knee3'
  | 'balance_pose1'
  | 'balance_pose2'
  | 'balance_pose3'
  | 'balance_pose4'
  | 'balance_pose5';

export type WorkoutKey = 'stretching' | 'upper_body' | 'knee' | 'balance';

export type PoseStepDef = {
  poseName: PoseName;
  // 이 단계 판정에 쓸 관절 — 여기 없는 관절은 라이브/기준 각도 모두 무시(마스킹)한다.
  // "지정한 관절은 전부 일치해야 통과"이므로 minVisibleJoints는 항상 activeJoints.length.
  activeJoints: JointAngleName[];
  // 이 단계를 얼마나 끊기지 않고 유지해야 다음 단계로 넘어가는지(ms).
  // 각 시퀀스의 첫 단계는 준비 자세로 보고 2초, 이후 단계는 운동 종류별로 다르게 둔다.
  holdMs: number;
};

const PREP_HOLD_MS = 2000;
const STRETCHING_UPPER_BODY_HOLD_MS = 8000;
const KNEE_BALANCE_HOLD_MS = 5000;

// ============================================================
// 튜닝 프로필 — 판정을 얼마나 엄격하게 할지 한 묶음으로 정의한다.
// ExercisePipeline 생성 시 넘기며, 앱 설정(AppModeContext)의 토글 조합으로 조립한다.
// ============================================================
export type ExerciseTuning = {
  // 관절 각도 하나당 허용 오차(도). 이 이내면 그 관절은 "일치"로 본다.
  angleToleranceDeg: number;
  // 매칭이 잠깐 끊겨도(노이즈 한두 프레임) 바로 리셋하지 않고 봐주는 유예 비율.
  // 유예 시간(ms) = 해당 단계 holdMs * 이 비율 — 홀드가 길수록 유예도 비례해서 늘어난다.
  graceRatio: number;
  sequences: Record<WorkoutKey, PoseStepDef[]>;
};

export type ExerciseTuningOptions = {
  // 모든 단계 유지 시간을 FAST_HOLD_MS로 통일한다(시연용 — 운동 한 세트가 금방 끝난다).
  fastHold: boolean;
  // 유예 비율을 늘리고, 자세와 무관하게 흔들리는 관절(팔 운동의 엉덩이, 하체 운동의
  // 팔꿈치)을 판정에서 뺀다.
  relaxed: boolean;
};

const FAST_HOLD_MS = 2000;

/** 원래 시퀀스 — 기준 포즈 사진 기준의 관절 서브셋과 운동별 유지 시간. */
const STRICT_SEQUENCES: Record<WorkoutKey, PoseStepDef[]> = {
  stretching: [
    { poseName: 'stretching1', activeJoints: [...HIP, ...KNEE], holdMs: PREP_HOLD_MS },
    { poseName: 'stretching2', activeJoints: [...HIP, ...SHOULDER, ...ELBOW], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'stretching3', activeJoints: [...HIP, ...SHOULDER, ...ELBOW], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
  ],
  upper_body: [
    { poseName: 'upper_body1', activeJoints: [...HIP, ...KNEE, ...SHOULDER], holdMs: PREP_HOLD_MS },
    { poseName: 'upper_body2', activeJoints: [...ELBOW, ...SHOULDER], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'upper_body3', activeJoints: [...ELBOW, ...SHOULDER], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'upper_body4', activeJoints: [...ELBOW, ...SHOULDER, ...HIP], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'upper_body5', activeJoints: [...ELBOW, ...SHOULDER, ...HIP], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
  ],
  knee: [
    { poseName: 'knee1', activeJoints: FULL_BODY, holdMs: PREP_HOLD_MS },
    { poseName: 'knee2', activeJoints: FULL_BODY, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'knee3', activeJoints: FULL_BODY, holdMs: KNEE_BALANCE_HOLD_MS },
  ],
  balance: [
    { poseName: 'balance_pose1', activeJoints: FULL_BODY, holdMs: PREP_HOLD_MS },
    { poseName: 'balance_pose2', activeJoints: FULL_BODY, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'balance_pose3', activeJoints: FULL_BODY, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'balance_pose4', activeJoints: FULL_BODY, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'balance_pose5', activeJoints: FULL_BODY, holdMs: KNEE_BALANCE_HOLD_MS },
  ],
};

/** 넉넉한 관절 서브셋 — 유지 시간은 STRICT와 같고 activeJoints만 줄인다. */
const RELAXED_SEQUENCES: Record<WorkoutKey, PoseStepDef[]> = {
  stretching: [
    { poseName: 'stretching1', activeJoints: [...HIP, ...KNEE], holdMs: PREP_HOLD_MS },
    { poseName: 'stretching2', activeJoints: [...SHOULDER, ...ELBOW], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'stretching3', activeJoints: [...SHOULDER, ...ELBOW], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
  ],
  upper_body: [
    { poseName: 'upper_body1', activeJoints: [...HIP, ...KNEE, ...SHOULDER], holdMs: PREP_HOLD_MS },
    { poseName: 'upper_body2', activeJoints: [...ELBOW, ...SHOULDER], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'upper_body3', activeJoints: [...ELBOW, ...SHOULDER], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'upper_body4', activeJoints: [...ELBOW, ...SHOULDER], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
    { poseName: 'upper_body5', activeJoints: [...ELBOW, ...SHOULDER], holdMs: STRETCHING_UPPER_BODY_HOLD_MS },
  ],
  knee: [
    { poseName: 'knee1', activeJoints: FULL_BODY, holdMs: PREP_HOLD_MS },
    { poseName: 'knee2', activeJoints: BODY_WITHOUT_ELBOW, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'knee3', activeJoints: BODY_WITHOUT_ELBOW, holdMs: KNEE_BALANCE_HOLD_MS },
  ],
  balance: [
    { poseName: 'balance_pose1', activeJoints: BODY_WITHOUT_ELBOW, holdMs: PREP_HOLD_MS },
    { poseName: 'balance_pose2', activeJoints: BODY_WITHOUT_ELBOW, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'balance_pose3', activeJoints: BODY_WITHOUT_ELBOW, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'balance_pose4', activeJoints: BODY_WITHOUT_ELBOW, holdMs: KNEE_BALANCE_HOLD_MS },
    { poseName: 'balance_pose5', activeJoints: BODY_WITHOUT_ELBOW, holdMs: KNEE_BALANCE_HOLD_MS },
  ],
};

function withHoldMs(
  sequences: Record<WorkoutKey, PoseStepDef[]>,
  holdMs: number,
): Record<WorkoutKey, PoseStepDef[]> {
  return Object.fromEntries(
    Object.entries(sequences).map(([key, steps]) => [
      key,
      steps.map((step) => ({ ...step, holdMs })),
    ]),
  ) as Record<WorkoutKey, PoseStepDef[]>;
}

/** 토글 조합으로 튜닝 프로필을 조립한다. 둘 다 false면 원래 값 그대로다. */
export function buildExerciseTuning(options: ExerciseTuningOptions): ExerciseTuning {
  const base = options.relaxed ? RELAXED_SEQUENCES : STRICT_SEQUENCES;
  return {
    angleToleranceDeg: 35,
    graceRatio: options.relaxed ? 1 / 2 : 1 / 5,
    sequences: options.fastHold ? withHoldMs(base, FAST_HOLD_MS) : base,
  };
}

/** 원래 값 프로필 — 프로필을 따로 지정하지 않을 때의 기본값. */
export const STRICT_EXERCISE_TUNING: ExerciseTuning = buildExerciseTuning({
  fastHold: false,
  relaxed: false,
});

// 백엔드 Exercise.pose_workout_key 검증 등 "어떤 워크아웃이 있는가"만 필요한 곳은
// 이 시퀀스의 키만 참조한다.
export const WORKOUT_POSE_SEQUENCES: Record<WorkoutKey, PoseStepDef[]> = STRICT_SEQUENCES;
