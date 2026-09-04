import type { SeniorProfileResponse } from './api/client';
import type { ActivityLevel } from './types';

/**
 * 백엔드 `senior.mobility_level` enum → 화면 표시용 한글 라벨(`ActivityLevel`).
 *
 * 피보호자 로그인 프로필(`LoginScreen`, 시니어 본인)과 보호자 피보호자 상세
 * (`SeniorDetailScreen`, "보호 등급")이 같은 매핑을 쓰므로 화면마다 중복
 * 정의하지 않고 여기 모은다. `Record<enum, label>` 형태라 백엔드 enum이
 * 늘어나면 컴파일 타임에 누락이 드러난다(`emergency.ts`의 라벨 Record와 동일 패턴).
 */
export const MOBILITY_LEVEL_TO_ACTIVITY_LEVEL: Record<
  SeniorProfileResponse['mobility_level'],
  ActivityLevel
> = {
  independent: '독립',
  partial_assist: '부분 보조',
  full_assist: '완전 보조',
};

/**
 * 위 매핑의 역방향(화면 한글 라벨 → 백엔드 enum).
 *
 * 시니어 회원가입(`SignupScreen`)의 거동 수준 선택 UI가 한글 `ActivityLevel`로
 * 상태를 들고 있는데, 등록 API(`POST /auth/senior/register/`)의 `mobility_level`은
 * enum을 요구하므로 전송 직전에 변환한다. `ActivityLevel` 유니온이 늘어나면
 * 여기서도 컴파일 에러가 나 누락이 드러난다.
 */
export const ACTIVITY_LEVEL_TO_MOBILITY_LEVEL: Record<
  ActivityLevel,
  SeniorProfileResponse['mobility_level']
> = {
  독립: 'independent',
  '부분 보조': 'partial_assist',
  '완전 보조': 'full_assist',
};
