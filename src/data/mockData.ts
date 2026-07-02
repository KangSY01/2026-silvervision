import {
  Exercise,
  GuardianProfile,
  MovementCompletionPoint,
  SeniorProfile,
  WeeklyActivityPoint,
} from '../types';

export const mockSeniors: SeniorProfile[] = [
  {
    id: 'senior01',
    password: '1234',
    name: '김순자',
    phone: '010-1234-5678',
    address: '부산광역시 해운대구 센텀중앙로 45',
    conditions: '경도 인지장애, 고혈압',
    mobilityLevel: '독립 보행 가능',
    medications: '혈압약(아침 1회)',
    fruitCount: 12,
    nationalRank: 158,
    regionRank: 12,
    region: '부산광역시 해운대구',
  },
];

export const mockGuardians: GuardianProfile[] = [
  {
    id: 'guardian01',
    password: '1234',
    name: '김민준',
    phone: '010-9876-5432',
    wardIds: ['senior01', 'senior02'],
  },
];

export const mockWards = [
  { id: 'senior01', name: '김순자', todayActivityCount: 3 },
  { id: 'senior02', name: '박영희', todayActivityCount: 1 },
];

export const mockExercises: Exercise[] = [
  {
    id: 'ex-stretch-01',
    category: 'stretching',
    title: '스트레칭',
    description: '목, 어깨, 허리를 부드럽게 풀어주는 전신 스트레칭',
    durationMinutes: 10,
  },
  {
    id: 'ex-upper-01',
    category: 'upper',
    title: '상체 운동',
    description: '팔과 어깨 근력을 키우는 앉아서 하는 상체 운동',
    durationMinutes: 8,
  },
  {
    id: 'ex-knee-01',
    category: 'knee',
    title: '무릎 운동',
    description: '무릎 관절을 보호하며 하는 다리 근력 운동',
    durationMinutes: 8,
  },
];

export const mockWeeklyActivity: WeeklyActivityPoint[] = [
  { day: '월', count: 2 },
  { day: '화', count: 3 },
  { day: '수', count: 1 },
  { day: '목', count: 4 },
  { day: '금', count: 2 },
  { day: '토', count: 3 },
  { day: '일', count: 3 },
];

export const mockMovementCompletion: MovementCompletionPoint[] = [
  { day: '월', percentage: 70 },
  { day: '화', percentage: 82 },
  { day: '수', percentage: 65 },
  { day: '목', percentage: 90 },
  { day: '금', percentage: 78 },
  { day: '토', percentage: 88 },
  { day: '일', percentage: 92 },
];