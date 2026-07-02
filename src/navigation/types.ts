import { UserType } from '../types';

export type RootStackParamList = {
  Entry: undefined;
  Login: { userType: UserType };
  SeniorHome: undefined;
  ExerciseList: undefined;
  SeniorProfile: undefined;
  GuardianHome: undefined;
  ActivityRecord: { wardId: string; wardName: string };
  AddWard: undefined;
  GuardianProfile: undefined;
};