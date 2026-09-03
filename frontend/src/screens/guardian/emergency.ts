import { EmergencyEventType, EmergencyStatus } from '../../api/client';

// 백엔드 EmergencyEvent.status(5종) → 화면 표시 라벨. Record라 백엔드 enum이
// 늘어나면 컴파일 타임에 누락이 드러난다(ExerciseSelectScreen의 DIFFICULTY_LABELS와
// 같은 패턴).
export const EMERGENCY_STATUS_LABELS: Record<EmergencyStatus, string> = {
  detected: '감지됨',
  first_check: '1차 확인 중',
  false_alarm: '오보',
  notified: '보호자 알림 전송됨',
  resolved: '상황 종결',
};

// 백엔드 EmergencyEvent.event_type(3종) → 화면 표시 라벨.
export const EMERGENCY_TYPE_LABELS: Record<EmergencyEventType, string> = {
  fall: '낙상 의심',
  inactivity: '장시간 무활동',
  sos: 'SOS 긴급 호출',
};

export type AlertFilterKey = 'all' | 'unconfirmed' | 'resolved';

// 목록 필터 분류 기준: 백엔드 전이 그래프상 false_alarm / resolved 만 "판정이
// 끝난" 상태이고, detected / first_check / notified 는 아직 대응이 진행 중이므로
// "미확인"으로 묶는다.
const CLOSED_STATUSES: ReadonlySet<EmergencyStatus> = new Set(['false_alarm', 'resolved']);

export function isAlertClosed(status: EmergencyStatus): boolean {
  return CLOSED_STATUSES.has(status);
}

export function matchesAlertFilter(status: EmergencyStatus, filter: AlertFilterKey): boolean {
  if (filter === 'unconfirmed') return !isAlertClosed(status);
  if (filter === 'resolved') return isAlertClosed(status);
  return true;
}

// 이번 배치에서 보호자가 수행 가능한 유일한 상태 전이는 →resolved 다.
// 백엔드 EMERGENCY_EVENT_TRANSITIONS(배포·검증 완료, 이번 배치에서 건드리지 않음):
//   detected → first_check → (false_alarm | notified) → resolved,
//   resolved 에서는 전이 불가.
// 보호자에게 이벤트는 보통 notified 상태로 도착하므로 notified/false_alarm → resolved
// 만 실제 동작으로 남기고, "오보 처리"(notified→false_alarm)·"미확인으로 재지정"
// (resolved→…)은 전이표에 없어 버튼 자체를 UI에서 제거했다.
const RESOLVABLE_FROM: ReadonlySet<EmergencyStatus> = new Set(['notified', 'false_alarm']);

export function canResolveAlert(status: EmergencyStatus): boolean {
  return RESOLVABLE_FROM.has(status);
}

// created_at(ISO) → "2026. 09. 03 10:15" 형태. 파싱 실패 시 원문을 그대로 반환.
export function formatEmergencyTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
