import { AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { apiClient } from '../api/client';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../theme/theme';

// 낙상 감지 직후 시니어에게 "괜찮으세요?"를 직접 확인받는 1차 확인 UI.
//
// 백엔드 응급 상태 머신(detected → first_check → (false_alarm | notified) →
// resolved)은 이미 구현·테스트돼 있고, 여기서는 기존 엔드포인트만 호출한다:
//  - 마운트 시 PATCH /emergency/{id}/ { status: 'first_check' }  (detected→first_check)
//  - "괜찮아요"        → PATCH /emergency/{id}/ { status: 'false_alarm' }
//  - "도움이 필요해요" / 무응답(제한시간 초과)
//                      → POST  /emergency/{id}/notify/  (first_check→notified + 보호자 알림 레코드 생성)
//
// notified 로의 전이는 PATCH 로는 서버가 거부하고(알림 레코드 없이 "보낸 것처럼"
// 보이는 상태 방지 — EmergencyEventStatusUpdateSerializer.validate_status), 반드시
// /notify/ 엔드포인트를 거쳐야 EmergencyNotification 이 생성된다. 둘 다 기존
// 엔드포인트다(신규 추가 아님).

// 무응답 시 자동으로 보호자에게 알리기까지의 대기 시간(초).
const RESPONSE_TIMEOUT_SEC = 30;

// 큰 소리 알람: 오디오 재생 라이브러리(expo-audio/expo-av)가 아직 없어 실제
// 사이렌음은 재생하지 못한다(신규 의존성 추가 금지 방침). 대신 기기 진동을 강하게
// 반복해 주의를 끈다 — 패턴은 [대기, 진동, 대기, 진동, …] ms, 두 번째 인자 true 로
// 반복. cancel() 로 해제한다.
const ALARM_VIBRATION_PATTERN = [0, 700, 400, 700, 400];

type Phase = 'asking' | 'sending' | 'safe' | 'notified' | 'error';

interface Props {
  /** POST /emergency/ 로 방금 생성된 이벤트의 event_id. */
  eventId: number;
  /** 확인이 끝나(안심 처리/보호자 알림 완료) 오버레이를 닫을 때. */
  onClose: () => void;
}

export default function EmergencyCheckOverlay({ eventId, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('asking');
  const [secondsLeft, setSecondsLeft] = useState(RESPONSE_TIMEOUT_SEC);
  const [errorText, setErrorText] = useState('');

  // 무응답 자동 에스컬레이션이 중복 실행되지 않도록.
  const escalatedRef = useRef(false);
  // "괜찮아요"와 자동 에스컬레이션이 카운트다운 0 근처에서 동시에 발사되는
  // 경쟁을 막는다(한쪽이 성공하면 다른 쪽 서버 전이는 400이 되지만, 애초에
  // 두 번 쏘지 않는 편이 깔끔하다). 에러 시 재시도할 수 있도록 되돌린다.
  const respondedRef = useRef(false);

  // 마운트 시: 알람 진동 시작 + detected→first_check 전이(best-effort).
  useEffect(() => {
    Vibration.vibrate(ALARM_VIBRATION_PATTERN, true);
    (async () => {
      try {
        await apiClient.patch(`/emergency/${eventId}/`, { status: 'first_check' });
      } catch {
        // 전이 실패(네트워크 등)해도 확인 UI 자체는 계속 보여준다. 이후
        // false_alarm/notify 호출은 시도하되 실패하면 안내 문구로 처리한다.
      }
    })();
    return () => {
      Vibration.cancel();
    };
  }, [eventId]);

  const stopAlarm = useCallback(() => {
    Vibration.cancel();
  }, []);

  const escalateToGuardian = useCallback(async () => {
    if (escalatedRef.current || respondedRef.current) return;
    escalatedRef.current = true;
    respondedRef.current = true;
    setPhase('sending');
    setErrorText('');
    try {
      // 보호자 미지정 → 연동된 보호자 전원에게 EmergencyNotification 생성.
      await apiClient.post(`/emergency/${eventId}/notify/`, {});
      stopAlarm();
      setPhase('notified');
    } catch {
      // 자동/수동 재시도가 가능하도록 가드를 되돌린다.
      escalatedRef.current = false;
      respondedRef.current = false;
      setPhase('error');
      setErrorText('보호자에게 알림을 보내지 못했습니다. 다시 시도해 주세요.');
    }
  }, [eventId, stopAlarm]);

  // 응답 제한시간 카운트다운. 0이 되면 자동으로 보호자에게 알린다.
  useEffect(() => {
    if (phase !== 'asking') return;
    if (secondsLeft <= 0) {
      void escalateToGuardian();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, escalateToGuardian]);

  const handleSafe = useCallback(async () => {
    if (respondedRef.current) return;
    respondedRef.current = true;
    setPhase('sending');
    setErrorText('');
    try {
      await apiClient.patch(`/emergency/${eventId}/`, { status: 'false_alarm' });
      stopAlarm();
      setPhase('safe');
    } catch {
      respondedRef.current = false;
      setPhase('error');
      setErrorText('응답을 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }, [eventId, stopAlarm]);

  const handleNeedHelp = useCallback(() => {
    void escalateToGuardian();
  }, [escalateToGuardian]);

  const handleRetryFromError = useCallback(() => {
    // 에러 상태에서는 다시 물어보는 단계로 되돌린다(카운트다운도 리셋).
    setPhase('asking');
    setSecondsLeft(RESPONSE_TIMEOUT_SEC);
    setErrorText('');
    Vibration.vibrate(ALARM_VIBRATION_PATTERN, true);
  }, []);

  // ── 렌더 ────────────────────────────────────────────────────────────
  if (phase === 'safe') {
    return (
      <View style={[styles.overlay, styles.overlaySafe]}>
        <CheckCircle2 size={72} color={colors.white} strokeWidth={2} />
        <Text style={styles.safeTitle}>안심하세요{'\n'}괜찮다고 전달했어요</Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.closeButtonText}>운동으로 돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'notified') {
    return (
      <View style={[styles.overlay, styles.overlaySafe]}>
        <PhoneCall size={72} color={colors.white} strokeWidth={2} />
        <Text style={styles.safeTitle}>보호자에게{'\n'}도움을 요청했어요</Text>
        <Text style={styles.safeSubtitle}>
          곧 보호자가 연락하거나 찾아올 거예요. 편한 자세로 기다려 주세요.
        </Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.closeButtonText}>확인</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.overlay}>
        <AlertTriangle size={64} color={colors.white} strokeWidth={2} />
        <Text style={styles.errorTitle}>{errorText}</Text>
        <Pressable
          onPress={handleRetryFromError}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.primaryButtonText}>다시 확인하기</Text>
        </Pressable>
        <Pressable
          onPress={handleNeedHelp}
          style={({ pressed }) => [styles.helpButton, pressed && styles.pressedOpacity]}
        >
          <Text style={styles.helpButtonText}>보호자에게 도움 요청</Text>
        </Pressable>
      </View>
    );
  }

  const sending = phase === 'sending';

  return (
    <View style={styles.overlay}>
      <View style={styles.iconBadge}>
        <AlertTriangle size={56} color={colors.white} strokeWidth={2.5} />
      </View>

      <Text style={styles.title}>괜찮으신가요?</Text>
      <Text style={styles.subtitle}>
        넘어지신 것 같아요.{'\n'}
        {secondsLeft}초 안에 응답이 없으면{'\n'}보호자에게 자동으로 알려드릴게요.
      </Text>

      <Pressable
        onPress={handleSafe}
        disabled={sending}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressedOpacity,
          sending && styles.buttonDisabled,
        ]}
      >
        <CheckCircle2 size={28} color={colors.primary} strokeWidth={2.5} />
        <Text style={styles.primaryButtonText}>네, 괜찮아요</Text>
      </Pressable>

      <Pressable
        onPress={handleNeedHelp}
        disabled={sending}
        style={({ pressed }) => [
          styles.helpButton,
          pressed && styles.pressedOpacity,
          sending && styles.buttonDisabled,
        ]}
      >
        <PhoneCall size={24} color={colors.white} strokeWidth={2.5} />
        <Text style={styles.helpButtonText}>
          {sending ? '전달 중...' : '도움이 필요해요'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  overlaySafe: {
    backgroundColor: colors.primary,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.brand,
    fontWeight: fontWeights.black,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 34,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET + 16,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  helpButton: {
    minHeight: MIN_TOUCH_TARGET + 16,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  helpButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  safeTitle: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.black,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 40,
  },
  safeSubtitle: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  errorTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.black,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 32,
  },
  closeButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  closeButtonText: {
    fontSize: fontSizes.button,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
