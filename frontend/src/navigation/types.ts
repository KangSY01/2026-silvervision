import { Workout } from '../types';

export type RootStackParamList = {
  Entry: undefined;
  Login: undefined;
  Signup: undefined;
  SeniorHome: undefined;
  ExerciseSelect: undefined;
  ExerciseProgress: { workout: Workout };
  ExerciseFeedback: {
    workout: Workout;
    // 세션 시작(ExerciseProgress mount 시 자동 생성)이 성공했을 때의 session_id.
    // 백엔드/네트워크 문제로 세션 생성이 실패하면 null이며, 이때 결과 화면은
    // 완료 PATCH·피드백 POST를 건너뛴다(화면 표시는 그대로 유지).
    sessionId: number | null;
    // ExerciseProgress 타이머 소진 비율(0~100 정수). 끝까지 채우면 100,
    // "건너뛰기"로 일찍 나가면 진행한 비율. completion_rate로 그대로 PATCH된다.
    completionRate: number;
  };
  Profile: undefined;
  GuardianLogin: undefined;
  GuardianSignup: undefined;
  GuardianHome: undefined;
  GuardianActivityList: undefined;
  AddSenior: undefined;
  SeniorDetail: { seniorId: string };
  GuardianProfile: undefined;
  AlertHistory: undefined;
  AlertDetail: { alertId: string };
};

// useNavigation()/useRoute()를 화면마다 제네릭 없이 쓸 수 있도록 전역 타입을 확장합니다.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
