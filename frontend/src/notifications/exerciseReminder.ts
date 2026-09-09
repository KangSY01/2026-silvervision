import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 운동 알림(로컬 전용) — 백엔드 API를 호출하지 않고 이 기기에만 매일 반복 알림을
// 예약한다. 저장은 AsyncStorage, 실제 예약은 expo-notifications의 daily 트리거.
// exercise_mission.scheduled_at(백엔드)와는 무관하다: 그 필드는 운동 화면 진입
// 시점의 현재시각으로 채워지는 별개 값이고, 여기서 다루는 건 "몇 시에 운동하라고
// 알림을 띄울지"라는 순수 클라이언트 설정이다.

const STORAGE_KEY = 'silvervision.exerciseReminder.v1';
// 예약을 항상 1건만 유지하기 위한 고정 식별자(중복 예약 방지).
const REMINDER_IDENTIFIER = 'exercise-daily-reminder';
const ANDROID_CHANNEL_ID = 'exercise-reminder';

const REMINDER_TITLE = '실버비전 운동 알림';
const REMINDER_BODY = '오늘의 운동을 시작해볼까요?';

export interface ExerciseReminderSetting {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export const DEFAULT_REMINDER_SETTING: ExerciseReminderSetting = {
  enabled: false,
  hour: 9,
  minute: 0,
};

// 앱 실행 중(포그라운드)에 알림이 도착해도 배너로 보이게 한다. 모듈 로드 시 1회.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  if (rounded < min || rounded > max) return fallback;
  return rounded;
}

export async function loadReminderSetting(): Promise<ExerciseReminderSetting> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_SETTING };
    const parsed = JSON.parse(raw) as Partial<ExerciseReminderSetting>;
    return {
      enabled: parsed.enabled === true,
      hour: clampInt(parsed.hour, 0, 23, DEFAULT_REMINDER_SETTING.hour),
      minute: clampInt(parsed.minute, 0, 59, DEFAULT_REMINDER_SETTING.minute),
    };
  } catch {
    return { ...DEFAULT_REMINDER_SETTING };
  }
}

async function persist(setting: ExerciseReminderSetting): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(setting));
  } catch {
    // 저장 실패는 조용히 넘어간다(다음 변경 때 다시 기록 시도).
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: '운동 알림',
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // 채널 생성 실패 시 기본 채널로 발송된다.
  }
}

async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  } catch {
    // 예약이 없으면 무시.
  }
}

async function scheduleReminder(hour: number, minute: number): Promise<void> {
  await ensureAndroidChannel();
  // 중복 예약 방지: 항상 기존 예약을 지우고 새로 건다.
  await cancelReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

async function hasPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    // Android 13+(POST_NOTIFICATIONS)·iOS 런타임 권한 요청은 여기서 처리된다.
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export type ApplyReminderResult = 'scheduled' | 'disabled' | 'permission-denied' | 'error';

// 토글/시간 변경의 단일 진입점. 켜는 경우 권한을 확인·요청하고, 거부되면
// enabled=false로 되돌려 저장한 뒤 'permission-denied'를 반환한다(호출자가 토글을
// 다시 끄고 안내 문구를 띄운다).
export async function applyReminderSetting(
  next: ExerciseReminderSetting,
): Promise<ApplyReminderResult> {
  const hour = clampInt(next.hour, 0, 23, DEFAULT_REMINDER_SETTING.hour);
  const minute = clampInt(next.minute, 0, 59, DEFAULT_REMINDER_SETTING.minute);

  if (!next.enabled) {
    await persist({ enabled: false, hour, minute });
    await cancelReminder();
    return 'disabled';
  }

  const granted = await hasPermission();
  if (!granted) {
    await persist({ enabled: false, hour, minute });
    await cancelReminder();
    return 'permission-denied';
  }

  try {
    await scheduleReminder(hour, minute);
    await persist({ enabled: true, hour, minute });
    return 'scheduled';
  } catch {
    await persist({ enabled: false, hour, minute });
    await cancelReminder();
    return 'error';
  }
}

// 앱 시작 시 호출: 저장된 설정과 실제 예약 상태를 맞춘다. 재설치·OS 업데이트로
// 예약이 사라졌는데 설정만 enabled로 남은 경우 다시 예약한다.
export async function syncScheduledReminder(): Promise<void> {
  try {
    const setting = await loadReminderSetting();
    if (!setting.enabled) {
      await cancelReminder();
      return;
    }

    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) {
      // 권한이 회수된 상태. 설정을 꺼진 것으로 정리해 두고(다음에 사용자가 다시
      // 켜면 권한을 새로 요청) 조용히 종료한다.
      await persist({ ...setting, enabled: false });
      await cancelReminder();
      return;
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const alreadyScheduled = scheduled.some((req) => req.identifier === REMINDER_IDENTIFIER);
    if (!alreadyScheduled) {
      await scheduleReminder(setting.hour, setting.minute);
    }
  } catch {
    // 동기화 실패는 앱 구동을 막지 않는다.
  }
}
