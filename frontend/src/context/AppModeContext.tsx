import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { buildExerciseTuning, type ExerciseTuning } from '@/pose/exercise';
import { RELAXED_FALL_TUNING, STRICT_FALL_TUNING, type FallTuning } from '@/pose/fall';

// 특수환경 설정. 개인정보 탭을 길게 눌러 여는 창(SpecialModeDialog)에서 토글한다.
// 전부 OFF가 제품 기본이고, 켜진 항목은 TabScreenLayout 헤더에 개수로 표시해
// 시연 후 되돌리는 것을 잊지 않게 한다. 선택은 AsyncStorage에 저장해 재시작 후에도 유지된다.
export type SpecialSettings = {
  fastHold: boolean; // 빠른 운동 — 모든 자세 2초 유지
  relaxedExercise: boolean; // 넉넉한 운동 기준 — 유예 ↑, 흔들리는 관절 제외
  relaxedFall: boolean; // 넉넉한 낙상 기준 — 임계값 0.95 → 0.90
  showDebug: boolean; // 디버깅 데이터 표기 — 관절 각도 표, landmark 점, 건너뛰기 버튼
};

export type SpecialSettingKey = keyof SpecialSettings;

export const SPECIAL_SETTING_LABELS: Record<SpecialSettingKey, string> = {
  fastHold: '빠른 운동',
  relaxedExercise: '넉넉한 운동 기준',
  relaxedFall: '넉넉한 낙상 기준',
  showDebug: '디버깅 데이터 표기',
};

export const SPECIAL_SETTING_DESCRIPTIONS: Record<SpecialSettingKey, string> = {
  fastHold: '모든 자세를 2초만 유지하면 통과',
  relaxedExercise: '자세 유예 시간을 늘리고 팔꿈치·엉덩이 등 일부 관절 제외',
  relaxedFall: '낙상 확률 임계값을 낮춰 더 잘 감지',
  showDebug: '관절 각도 표, 관절 점, 건너뛰기 버튼 표시',
};

export const SPECIAL_SETTING_ORDER: SpecialSettingKey[] = [
  'fastHold',
  'relaxedExercise',
  'relaxedFall',
  'showDebug',
];

export const DEFAULT_SPECIAL_SETTINGS: SpecialSettings = {
  fastHold: false,
  relaxedExercise: false,
  relaxedFall: false,
  showDebug: false,
};

const STORAGE_KEY = 'specialSettings';

function parseStored(raw: string | null): SpecialSettings | null {
  if (raw == null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed == null) return null;
    const obj = parsed as Record<string, unknown>;
    // 알려진 키만 boolean으로 받고, 나머지는 기본값(false)으로 채운다.
    const out = { ...DEFAULT_SPECIAL_SETTINGS };
    for (const key of SPECIAL_SETTING_ORDER) {
      if (typeof obj[key] === 'boolean') out[key] = obj[key] as boolean;
    }
    return out;
  } catch {
    return null;
  }
}

interface AppModeContextValue {
  settings: SpecialSettings;
  setSetting: (key: SpecialSettingKey, value: boolean) => void;
  enabledCount: number;
  exerciseTuning: ExerciseTuning;
  fallTuning: FallTuning;
  showDebug: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SpecialSettings>(DEFAULT_SPECIAL_SETTINGS);

  // 저장된 설정 복원. 읽기 실패/값 없음이면 전부 OFF 유지.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const stored = parseStored(raw);
        if (!cancelled && stored != null) setSettings(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setSetting = useCallback((key: SpecialSettingKey, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // 저장 실패는 조용히 넘긴다 — 이번 실행 동안의 변경은 이미 반영됐다.
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({
      settings,
      setSetting,
      enabledCount: SPECIAL_SETTING_ORDER.filter((key) => settings[key]).length,
      exerciseTuning: buildExerciseTuning({
        fastHold: settings.fastHold,
        relaxed: settings.relaxedExercise,
      }),
      fallTuning: settings.relaxedFall ? RELAXED_FALL_TUNING : STRICT_FALL_TUNING,
      showDebug: settings.showDebug,
    }),
    [settings, setSetting],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (ctx == null) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return ctx;
}
