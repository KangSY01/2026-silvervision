import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from 'react';
import { Guardian, UserProfile } from '../types';

// 로그인 전 초기값(플레이스홀더). LoginScreen이 로그인 성공 시 GET /senior/{id}/
// 응답으로 setUserProfile()을 호출해 덮어쓰므로, 이 값은 로그인 화면 진입 전까지만
// 존재하고 실제 화면(SeniorHome 등)에는 노출되지 않는다.
const DEFAULT_PROFILE: UserProfile = {
  name: '김철수',
  id: 'silver123',
  pw: '1234',
  phone: '010-5555-8888',
  address: '서울시 종로구 건강길 100, 대왕빌라 3층',
  diseases: '초기 퇴행성 관절염, 약간의 이명',
  activityLevel: '독립',
  medication: '혈압약 (아침 1정)',
  fruitCount: 0,
};

// 로그인 전 초기값(플레이스홀더). GuardianLoginScreen이 로그인 성공 시
// GET /guardian/{id}/ 응답으로 setGuardianProfile()을 호출해 덮어쓴다.
const DEFAULT_GUARDIAN: Guardian = {
  name: '박보호',
  id: 'guardian1',
  pw: '1234',
  phone: '010-9999-1234',
  address: '서울시 마포구 독막로 45, 래미안아파트 101동 502호',
};

interface AppStateContextValue {
  userProfile: UserProfile;
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;
  guardianProfile: Guardian;
  setGuardianProfile: (guardian: Guardian) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [guardianProfile, setGuardianProfile] = useState<Guardian>(DEFAULT_GUARDIAN);

  return (
    <AppStateContext.Provider
      value={{
        userProfile,
        setUserProfile,
        guardianProfile,
        setGuardianProfile,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState는 AppStateProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
}
