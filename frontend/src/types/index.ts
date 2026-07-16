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
  id: string;
  name: string;
  difficulty: '쉬움' | '보통';
  duration: string;
  description: string;
  iconName: string;
}
