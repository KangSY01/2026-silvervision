// ============================================================
// 기준 포즈 데이터 — assets/poses/*.json(output_new_exercises를
// frontend/scripts/convert-pose-json.mjs로 변환한 world_landmarks [x,y,z] 33개)을
// 불러와 라이브 프레임과 동일한 computeJointAngles로 기준 관절 각도를 한 번만 계산해둔다.
// (라이브/기준 각도 계산 로직이 서로 어긋날 일이 없도록 같은 함수를 재사용.)
//
// 포즈별로 판정에 쓸 관절이 다르므로(WORKOUT_POSE_SEQUENCES.activeJoints), 전체 8개
// 각도를 계산한 뒤 활성 관절이 아닌 슬롯은 null로 마스킹해 WORKOUT_MATCH_TARGETS로 노출한다.
// ============================================================
import stretching1 from '@/assets/poses/stretching1.json';
import stretching2 from '@/assets/poses/stretching2.json';
import stretching3 from '@/assets/poses/stretching3.json';
import upper_body1 from '@/assets/poses/upper_body1.json';
import upper_body2 from '@/assets/poses/upper_body2.json';
import upper_body3 from '@/assets/poses/upper_body3.json';
import upper_body4 from '@/assets/poses/upper_body4.json';
import upper_body5 from '@/assets/poses/upper_body5.json';
import knee1 from '@/assets/poses/knee1.json';
import knee2 from '@/assets/poses/knee2.json';
import knee3 from '@/assets/poses/knee3.json';
import balance_pose1 from '@/assets/poses/balance_pose1.json';
import balance_pose2 from '@/assets/poses/balance_pose2.json';
import balance_pose3 from '@/assets/poses/balance_pose3.json';
import balance_pose4 from '@/assets/poses/balance_pose4.json';
import balance_pose5 from '@/assets/poses/balance_pose5.json';

import {
  JOINT_ANGLE_DEFS,
  WORKOUT_POSE_SEQUENCES,
  type JointAngleName,
  type PoseName,
  type WorkoutKey,
} from './constants';
import { computeJointAngles, type WorldLandmark } from './geometry';

type RawPose = [number, number, number][]; // 33개 [x,y,z]

// MediaPipe 33-landmark 좌우 쌍 인덱스. 기준 포즈 스튜디오 사진이 좌우 반전된 상태로
// 저장되어 있어(폰 셀피 저장 시 흔한 미러 저장), 사진에서 뽑은 world_landmarks의
// left_*/right_* 라벨이 라이브 카메라(원본 센서 기준, 미러 안 됨)와 정반대로 붙어있다.
// 대칭 자세(양팔 동시에 들기 등)에선 안 드러나지만, 좌우가 다른 비대칭 자세(기울기·
// 균형 자세)에서 "반대로 움직여야 매칭되는" 증상으로 나타나 실기기 테스트로 확인됨.
// 각도(angleAtVertex)는 반사(mirror)해도 값이 그대로라 좌표 부호는 안 건드리고
// 좌우 라벨(배열 위치)만 맞바꾸면 된다.
const MIRROR_PAIRS: [number, number][] = [
  [1, 4], [2, 5], [3, 6], // 눈(안쪽/눈/바깥쪽)
  [7, 8], // 귀
  [9, 10], // 입
  [11, 12], [13, 14], [15, 16], // 어깨/팔꿈치/손목
  [17, 18], [19, 20], [21, 22], // 새끼/검지/엄지
  [23, 24], [25, 26], [27, 28], // 엉덩이/무릎/발목
  [29, 30], [31, 32], // 뒤꿈치/발끝
];

function mirrorLeftRight<T>(landmarks: T[]): T[] {
  const out = landmarks.slice();
  for (const [a, b] of MIRROR_PAIRS) {
    [out[a], out[b]] = [out[b], out[a]];
  }
  return out;
}

function toWorldLandmarks(raw: RawPose): WorldLandmark[] {
  // 스튜디오/정적 사진에서 뽑은 기준 포즈라 전신이 보인다고 가정 — visibility 항상 1.
  const landmarks = raw.map(([x, y, z]) => ({ x, y, z, visibility: 1 }));
  return mirrorLeftRight(landmarks);
}

export const RAW_POSES: Record<PoseName, RawPose> = {
  stretching1: stretching1 as RawPose,
  stretching2: stretching2 as RawPose,
  stretching3: stretching3 as RawPose,
  upper_body1: upper_body1 as RawPose,
  upper_body2: upper_body2 as RawPose,
  upper_body3: upper_body3 as RawPose,
  upper_body4: upper_body4 as RawPose,
  upper_body5: upper_body5 as RawPose,
  knee1: knee1 as RawPose,
  knee2: knee2 as RawPose,
  knee3: knee3 as RawPose,
  balance_pose1: balance_pose1 as RawPose,
  balance_pose2: balance_pose2 as RawPose,
  balance_pose3: balance_pose3 as RawPose,
  balance_pose4: balance_pose4 as RawPose,
  balance_pose5: balance_pose5 as RawPose,
};

// 마스킹 전, 8개 관절 각도 전부를 계산한 기준값.
const FULL_REFERENCE_ANGLES: Record<PoseName, (number | null)[]> = Object.fromEntries(
  Object.entries(RAW_POSES).map(([name, raw]) => [
    name,
    computeJointAngles(toWorldLandmarks(raw as RawPose)),
  ]),
) as Record<PoseName, (number | null)[]>;

function maskAngles(
  angles: (number | null)[],
  activeJoints: JointAngleName[],
): (number | null)[] {
  return JOINT_ANGLE_DEFS.map((def, i) => (activeJoints.includes(def.name) ? angles[i] : null));
}

export type PoseMatchTarget = {
  poseName: PoseName;
  refAngles: (number | null)[]; // activeJoints 외 슬롯은 null로 마스킹됨
  minVisibleJoints: number; // = activeJoints.length ("지정 관절 전부 일치"해야 통과)
  holdMs: number;
};

/** workoutKey/stepIndex로 바로 조회 가능한, 마스킹 적용된 매칭 타깃 목록. */
export const WORKOUT_MATCH_TARGETS: Record<WorkoutKey, PoseMatchTarget[]> = Object.fromEntries(
  Object.entries(WORKOUT_POSE_SEQUENCES).map(([workoutKey, steps]) => [
    workoutKey,
    steps.map((step) => ({
      poseName: step.poseName,
      refAngles: maskAngles(FULL_REFERENCE_ANGLES[step.poseName], step.activeJoints),
      minVisibleJoints: step.activeJoints.length,
      holdMs: step.holdMs,
    })),
  ]),
) as Record<WorkoutKey, PoseMatchTarget[]>;
