import { Workout } from '../types';

export type RootStackParamList = {
  Entry: undefined;
  Login: undefined;
  Signup: undefined;
  SeniorHome: undefined;
  ExerciseSelect: undefined;
  ExerciseProgress: { workout: Workout };
  ExerciseFeedback: { workout: Workout };
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
