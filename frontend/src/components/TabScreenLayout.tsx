import { useNavigation } from '@react-navigation/native';
import { Dumbbell, Home, User } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppMode } from '../context/AppModeContext';
import SpecialModeDialog, { SPECIAL_MODE_LONG_PRESS_MS } from './SpecialModeDialog';
import {
  colors,
  fontSizes,
  fontWeights,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
} from '../theme/theme';

export type TabKey = 'home' | 'workout' | 'profile';

interface TabScreenLayoutProps {
  activeTab: TabKey;
  children: ReactNode;
}

export default function TabScreenLayout({ activeTab, children }: TabScreenLayoutProps) {
  const navigation = useNavigation();
  const { enabledCount } = useAppMode();
  // 개인정보 탭 길게 누름(SPECIAL_MODE_LONG_PRESS_MS)으로 여는 특수환경 창.
  // Pressable은 onLongPress가 발화하면 onPress를 부르지 않으므로 화면 이동은 일어나지 않는다.
  const [specialModeVisible, setSpecialModeVisible] = useState(false);

  const handleGoHome = () => {
    navigation.navigate('SeniorHome');
  };

  const handleGoWorkout = () => {
    navigation.navigate('ExerciseSelect');
  };

  const handleGoProfile = () => {
    navigation.navigate('Profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Universal Sticky Header */}
      <View style={styles.appHeader}>
        <Pressable onPress={handleGoHome} style={styles.wordmark}>
          <View style={styles.wordmarkIcon}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.wordmarkImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.wordmarkText}>실버비전</Text>
        </Pressable>

        {/* 특수환경 설정이 하나라도 켜져 있으면 "시니어 전용" 대신 개수를 표시해
            시연 후 되돌리는 것을 잊지 않게 한다. */}
        <View style={[styles.statusPill, enabledCount > 0 && styles.statusPillMode]}>
          <View style={[styles.statusDot, enabledCount > 0 && styles.statusDotMode]} />
          <Text style={[styles.statusPillText, enabledCount > 0 && styles.statusPillTextMode]}>
            {enabledCount > 0 ? `특수환경 ${enabledCount}개` : '시니어 전용'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      {/* Unified Global Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressedOpacity]}
        >
          <Home
            size={28}
            color={activeTab === 'home' ? colors.primary : colors.inactiveIcon}
            strokeWidth={2.5}
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>홈</Text>
        </Pressable>

        <Pressable
          onPress={handleGoWorkout}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressedOpacity]}
        >
          <Dumbbell
            size={28}
            color={activeTab === 'workout' ? colors.primary : colors.inactiveIcon}
            strokeWidth={2.5}
          />
          <Text style={[styles.tabLabel, activeTab === 'workout' && styles.tabLabelActive]}>
            운동하기
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoProfile}
          onLongPress={() => setSpecialModeVisible(true)}
          delayLongPress={SPECIAL_MODE_LONG_PRESS_MS}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressedOpacity]}
        >
          <User
            size={28}
            color={activeTab === 'profile' ? colors.primary : colors.inactiveIcon}
            strokeWidth={2.5}
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            개인정보
          </Text>
        </Pressable>
      </View>

      <SpecialModeDialog
        visible={specialModeVisible}
        onClose={() => setSpecialModeVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appHeader: {
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  wordmarkIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wordmarkImage: {
    width: '100%',
    height: '100%',
  },
  wordmarkText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryTintBackground,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: fontWeights.black,
    color: colors.primary,
  },
  statusPillMode: {
    backgroundColor: colors.warningBackground,
    borderColor: colors.warningBorder,
  },
  statusDotMode: {
    backgroundColor: colors.white,
  },
  statusPillTextMode: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    height: 80,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  tabButton: {
    minWidth: 70,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.black,
    color: colors.inactiveIcon,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  pressedOpacity: {
    opacity: 0.6,
  },
});
