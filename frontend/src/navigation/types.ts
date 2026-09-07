import { ExerciseResult, Workout } from '../types';

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
    // 카메라 기반 ExercisePipeline이 집계한 실제 단계 진행 결과.
    // completion_rate는 여기서 completedSteps/totalSteps로 파생하므로 별도
    // 파라미터로 넘기지 않는다.
    result: ExerciseResult;
  };
  Profile: undefined;
  // 장기 신체 능력 변화 추적(관절 가동범위·동작 완성도 추이). SeniorHome에서 진입,
  // 화면이 GET /senior/{id}/ability-log/를 직접 조회한다(params 없음).
  AbilityHistory: undefined;
  GuardianLogin: undefined;
  GuardianSignup: undefined;
  GuardianHome: undefined;
  GuardianActivityList: undefined;
  AddSenior: undefined;
  SeniorDetail: { seniorId: string };
  GuardianProfile: undefined;
  AlertHistory: undefined;
  // 백엔드 emergency_event.event_id (정수). 상세 화면이 GET /emergency/{eventId}/로 조회한다.
  AlertDetail: { eventId: number };
  // 개발 전용 — 카메라 파이프라인만 따로 확인하는 스모크 테스트 화면
  // (워크아웃 'stretching' 고정, 백엔드 세션과 무관). EntryScreen에서 진입.
  PoseSmokeTest: undefined;
};

// useNavigation()/useRoute()를 화면마다 제네릭 없이 쓸 수 있도록 전역 타입을 확장합니다.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
