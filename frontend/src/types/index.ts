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

export interface Senior {
  id: string;
  name: string;
  status: 'stretch_completed' | 'not_connected' | 'fall_detected';
  weeklyWorkoutCount: number;
  avatarInitials: string;
  phone?: string;
  address?: string;
  diseases?: string;
}

export interface EmergencyEvent {
  id: string;
  type: 'fall' | 'injury';
  message: string;
  seniorName: string;
  timestamp: string;
  status: '확인됨' | '오탐' | '미확인';
}

export interface Workout {
  id: number;
  name: string;
  category: string;
  difficulty: '쉬움' | '보통' | '어려움';
}
