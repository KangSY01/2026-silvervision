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

// ⚠️ 실기기 튜닝 대상 — 아래 값은 시작값이며 실제 사용감 보고 조정할 것.
// 관절 각도 하나당 허용 오차(도). 이 이내면 그 관절은 "일치"로 본다.
export const ANGLE_TOLERANCE_DEG = 35;
// 매칭이 잠깐 끊겨도(노이즈 한두 프레임) 바로 리셋하지 않고 봐주는 유예 비율.
// 유예 시간(ms) = 해당 단계 holdMs * 이 비율 — 홀드가 길수록 유예도 비례해서 늘어난다.
export const GRACE_RATIO = 1 / 5;

// ============================================================
// 신체 부위 그룹 — 좌우 미표기 관절 이름은 항상 양쪽(l_/r_) 다 포함한다.
// ============================================================
const HIP: JointAngleName[] = ['l_hip', 'r_hip'];
const KNEE: JointAngleName[] = ['l_knee', 'r_knee'];
const SHOULDER: JointAngleName[] = ['l_shoulder', 'r_shoulder'];
const ELBOW: JointAngleName[] = ['l_elbow', 'r_elbow'];
const FULL_BODY: JointAngleName[] = JOINT_ANGLE_DEFS.map((d) => d.name);

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

export const WORKOUT_POSE_SEQUENCES: Record<WorkoutKey, PoseStepDef[]> = {
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
