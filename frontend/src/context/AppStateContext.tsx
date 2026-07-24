import { createContext, ReactNode, useContext, useState } from 'react';
import { EmergencyEvent, Guardian, Senior, UserProfile } from '../types';

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

// TODO: 보호자용 백엔드 API 연결 후 실제 등록된 피보호자 목록으로 교체
const DEFAULT_SENIORS: Senior[] = [
  {
    id: 'silver123',
    name: '김철수',
    status: 'stretch_completed',
    weeklyWorkoutCount: 5,
    avatarInitials: '철수',
    phone: '010-5555-8888',
    address: '서울시 종로구 건강길 100, 대왕빌라 3층',
    diseases: '초기 퇴행성 관절염, 약간의 이명',
  },
  {
    id: 'silver777',
    name: '이순자',
    status: 'not_connected',
    weeklyWorkoutCount: 2,
    avatarInitials: '순자',
    phone: '010-2222-3333',
    address: '서울시 서대문구 안산길 45, 한글아파트 104동',
    diseases: '골다공증, 가벼운 고혈압',
  },
];

// TODO: 보호자용 백엔드 API 연결 후 실제 긴급 알림 기록으로 교체
const DEFAULT_ALERTS: EmergencyEvent[] = [
  {
    id: 'alert1',
    type: 'fall',
    message: '화장실 앞 낙상 의심 감지',
    seniorName: '김철수',
    timestamp: '오늘 10:15',
    status: '미확인',
  },
  {
    id: 'alert2',
    type: 'injury',
    message: '거실 소파 부근 미접속 감지',
    seniorName: '김철수',
    timestamp: '오늘 08:30',
    status: '확인됨',
  },
  {
    id: 'alert3',
    type: 'fall',
    message: '안방 침대 옆 낙상 의심 감지',
    seniorName: '이순자',
    timestamp: '어제 18:22',
    status: '오탐',
  },
  {
    id: 'alert4',
    type: 'fall',
    message: '거실 스마트 운동 중 균형상실 낙상 의심',
    seniorName: '김철수',
    timestamp: '어제 14:05',
    status: '확인됨',
  },
  {
    id: 'alert5',
    type: 'injury',
    message: '주방 싱크대 앞 부상 의심 감지',
    seniorName: '이순자',
    timestamp: '3일 전',
    status: '확인됨',
  },
];

const DEFAULT_FRUITS_COLLECTED = 4;
const MAX_FRUITS = 6;

interface AppStateContextValue {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  guardianProfile: Guardian;
  setGuardianProfile: (guardian: Guardian) => void;
  seniors: Senior[];
  setSeniors: (seniors: Senior[]) => void;
  alerts: EmergencyEvent[];
  setAlerts: (alerts: EmergencyEvent[]) => void;
  fruitsCollected: number;
  incrementFruitsCollected: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [guardianProfile, setGuardianProfile] = useState<Guardian>(DEFAULT_GUARDIAN);
  const [seniors, setSeniors] = useState<Senior[]>(DEFAULT_SENIORS);
  const [alerts, setAlerts] = useState<EmergencyEvent[]>(DEFAULT_ALERTS);
  const [fruitsCollected, setFruitsCollected] = useState(DEFAULT_FRUITS_COLLECTED);

  const incrementFruitsCollected = () => {
    setFruitsCollected((prev) => Math.min(prev + 1, MAX_FRUITS));
  };

  return (
    <AppStateContext.Provider
      value={{
        userProfile,
        setUserProfile,
        guardianProfile,
        setGuardianProfile,
        seniors,
        setSeniors,
        alerts,
        setAlerts,
        fruitsCollected,
        incrementFruitsCollected,
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
