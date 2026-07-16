import { useNavigation } from '@react-navigation/native';
import { Dumbbell, Heart, Home, User } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    <View style={styles.container}>
      {/* Universal Sticky Header */}
      <View style={styles.appHeader}>
        <Pressable onPress={handleGoHome} style={styles.wordmark}>
          <View style={styles.wordmarkIcon}>
            <Heart size={16} color={colors.white} fill={colors.white} />
          </View>
          <Text style={styles.wordmarkText}>실버비전</Text>
        </Pressable>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>시니어 전용</Text>
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
    </View>
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
