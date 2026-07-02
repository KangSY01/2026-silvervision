export type UserType = 'senior' | 'guardian';

export type ExerciseCategory = 'stretching' | 'upper' | 'knee';

export interface Exercise {
  id: string;
  category: ExerciseCategory;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface SeniorProfile {
  id: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  conditions: string; // 질환
  mobilityLevel: string; // 거동 수준
  medications: string; // 복용약
  fruitCount: number; // 나무 열매 개수
  nationalRank: number;
  regionRank: number;
  region: string;
}

export interface Ward {
  id: string; // senior id 참조
  name: string;
  todayActivityCount: number;
}

export interface WeeklyActivityPoint {
  day: string;
  count: number;
}

export interface MovementCompletionPoint {
  day: string;
  percentage: number;
}

export interface GuardianProfile {
  id: string;
  password: string;
  name: string;
  phone: string;
  wardIds: string[];
}