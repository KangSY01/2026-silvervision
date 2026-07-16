import { Mic, Sparkles, Volume2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fontWeights, MIN_TOUCH_TARGET, radius, spacing } from '../theme/theme';

// 참고용 컴포넌트: 음성 인식 기능은 아직 별도 설계가 필요해 미확정 상태입니다.
// AGENTS.md 5장 방침에 따라 현재는 어디에도 마운트하지 않습니다 (설계 확정 후 연결 예정).

export type VoiceAssistantAction = 'workout' | 'profile' | 'fruits' | 'rank';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: VoiceAssistantAction, workoutId?: string) => void;
  fruitsCollected: number;
}

type AssistantStatus = 'listening' | 'processing' | 'speaking';

const SUGGESTIONS: {
  command: string;
  action: VoiceAssistantAction;
  tag: string;
}[] = [
  { command: '무릎 운동 시작해줘', action: 'workout', tag: '즉시 운동시작' },
  { command: '내 개인정보 보여줘', action: 'profile', tag: '정보 화면' },
  { command: '나 열매 몇 개 모았어?', action: 'fruits', tag: '나무 확인' },
  { command: '내 순위 알려줘', action: 'rank', tag: '순위 조회' },
];

export default function VoiceAssistantModal({
  visible,
  onClose,
  onSelectAction,
  fruitsCollected,
}: VoiceAssistantModalProps) {
  const [status, setStatus] = useState<AssistantStatus>('listening');
  const [spokenText, setSpokenText] = useState('');
  const [assistantReply, setAssistantReply] = useState('');

  useEffect(() => {
    if (visible) {
      setStatus('listening');
      setSpokenText('');
      setAssistantReply('');
    }
  }, [visible]);

  const handleCommandPress = (command: string, action: VoiceAssistantAction) => {
    setSpokenText(`"${command}"`);
    setStatus('processing');

    setTimeout(() => {
      setStatus('speaking');

      if (action === 'workout') {
        setAssistantReply('어르신을 위한 무릎 근력 운동을 시작할게요. 준비되셨나요?');
        setTimeout(() => {
          onSelectAction('workout', 'knee');
          onClose();
        }, 2200);
      } else if (action === 'profile') {
        setAssistantReply('어르신의 가입 정보와 거동 수준 카드를 보여드릴게요.');
        setTimeout(() => {
          onSelectAction('profile');
          onClose();
        }, 2200);
      } else if (action === 'fruits') {
        setAssistantReply(`어르신은 현재 열매를 총 ${fruitsCollected}개 모으셨어요! 참 잘하셨습니다.`);
        setTimeout(() => {
          onSelectAction('fruits');
        }, 3000);
      } else if (action === 'rank') {
        setAssistantReply('어르신은 현재 전국 247위, 우리 동네에서는 12위로 아주 훌륭한 성적입니다!');
        setTimeout(() => {
          onSelectAction('rank');
        }, 3000);
      }
    }, 1000);
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressedOpacity]}
        >
          <X size={22} color={colors.disabledText} />
        </Pressable>

        <View style={styles.headerRow}>
          <Sparkles size={18} color={colors.primary} fill={colors.primary} />
          <Text style={styles.headerText}>실버비전 말로 찾기</Text>
        </View>

        <View style={styles.statusArea}>
          {status === 'listening' && (
            <>
              <View style={styles.listeningRingWrap}>
                <View style={styles.listeningRingOuter} />
                <View style={styles.listeningRingInner} />
                <View style={styles.listeningCore}>
                  <Mic size={30} color={colors.white} />
                </View>
              </View>
              <Text style={styles.listeningTitle}>듣고 있습니다...</Text>
              <Text style={styles.listeningSubtitle}>원하시는 기능을 터치하거나 말씀해 보세요</Text>
            </>
          )}

          {status === 'processing' && (
            <>
              <View style={styles.processingDotsRow}>
                <View style={styles.processingDot} />
                <View style={styles.processingDot} />
                <View style={styles.processingDot} />
              </View>
              <Text style={styles.processingText}>{spokenText || '생각하는 중...'}</Text>
            </>
          )}

          {status === 'speaking' && (
            <>
              <View style={styles.speakingCore}>
                <Volume2 size={30} color={colors.white} />
              </View>
              <Text style={styles.speakingText}>{assistantReply}</Text>
            </>
          )}
        </View>

        {status === 'listening' && (
          <View style={styles.suggestionsArea}>
            <Text style={styles.suggestionsHint}>
              💡 아래 버튼을 누르면 바로 말한 것처럼 동작해요:
            </Text>

            <View style={styles.suggestionsList}>
              {SUGGESTIONS.map((item) => (
                <Pressable
                  key={item.action}
                  onPress={() => handleCommandPress(item.command, item.action)}
                  style={({ pressed }) => [
                    styles.suggestionButton,
                    pressed && styles.suggestionButtonPressed,
                  ]}
                >
                  <Text style={styles.suggestionCommand}>🗣️ "{item.command}"</Text>
                  <View style={styles.suggestionTag}>
                    <Text style={styles.suggestionTagText}>{item.tag}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayDark,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modalDragHandle,
    marginBottom: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md + 2,
    right: spacing.md + 2,
    width: MIN_TOUCH_TARGET - 12,
    height: MIN_TOUCH_TARGET - 12,
    borderRadius: (MIN_TOUCH_TARGET - 12) / 2,
    backgroundColor: colors.modalCloseBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  statusArea: {
    width: '100%',
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  listeningRingWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningRingOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.listeningRingInner,
  },
  listeningRingInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.listeningRingOuter,
  },
  listeningCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  listeningTitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    marginTop: spacing.md,
  },
  listeningSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.disabledText,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  processingDotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  processingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  processingText: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.medium,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
  speakingCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  speakingText: {
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: spacing.md,
  },
  suggestionsArea: {
    width: '100%',
    marginTop: spacing.xs,
  },
  suggestionsHint: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: colors.disabledText,
    marginBottom: spacing.sm,
  },
  suggestionsList: {
    gap: spacing.sm + 2,
  },
  suggestionButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primarySoftBorderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  suggestionButtonPressed: {
    backgroundColor: colors.suggestionPressedBackground,
  },
  suggestionCommand: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  suggestionTag: {
    backgroundColor: colors.primaryTintBackground,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  suggestionTagText: {
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
