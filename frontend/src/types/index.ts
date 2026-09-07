export type ActivityLevel = '독립' | '부분 보조' | '완전 보조';

export interface UserProfile {
  name: string;
  id: string;
  pw: string;
  phone: string;
  address: string;
  diseases: string;
  activityLevel: ActivityLevel;
  medication: string;
  // SeniorProfileResponse.fruit_count(게임화 보상 열매 개수)의 단일 소스.
  // 로그인 시 채워지고, SeniorHomeScreen이 포커스마다 최신 값으로 갱신한다.
  fruitCount: number;
}

export interface Guardian {
  name: string;
  id: string;
  pw: string;
  phone: string;
  address: string;
}

export interface Workout {
  id: number;
  name: string;
  category: string;
  difficulty: '쉬움' | '보통' | '어려움';
  // 화면 표시용 category(자유 텍스트)와 별개로, 실제 카메라 판정에 쓸 포즈
  // 시퀀스를 고르는 키. 백엔드 Exercise.pose_workout_key에서 그대로 오며,
  // src/pose/exercise의 WORKOUT_POSE_SEQUENCES 키와 일치해야 한다.
  poseWorkoutKey: PoseWorkoutKey;
}

// 카메라 판정 시퀀스 키. src/pose/exercise/constants.ts의 WorkoutKey와 같은
// 집합이며, 백엔드 Exercise.PoseWorkoutKey choices와도 일치한다.
export type PoseWorkoutKey = 'stretching' | 'upper_body' | 'knee' | 'balance';

// ExerciseProgressScreen의 카메라 기반 ExercisePipeline(src/pose/exercise)이
// 만들어낸 결과를 ExerciseFeedbackScreen으로 전달하기 위한 타입.
//
// accuracyScore는 현재 completedSteps/totalSteps 비율(0~100)로, completion_rate와
// 같은 값이다 — matcher.ts의 matchesPose()가 boolean만 반환해 관절별 각도 편차를
// 노출하지 않기 때문이다. 이름은 accuracy지만 의미는 "단계 통과율"이라 화면에는
// '동작 완료율'로 표시한다. matcher가 각도 차이를 함께 반환하도록 확장되면 그때
// 실제 정확도로 갈라진다.
export interface ExerciseResult {
  totalSteps: number;
  completedSteps: number;
  accuracyScore: number;
  elapsedMs: number;
}
