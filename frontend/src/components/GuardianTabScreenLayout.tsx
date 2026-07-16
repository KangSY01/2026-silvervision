import { useNavigation } from '@react-navigation/native';
import { House, Shield, User, Users } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fontWeights,
  GUARDIAN_MIN_TOUCH_TARGET,
  guardianFontSizes,
  radius,
  spacing,
} from '../theme/theme';

export type GuardianTabKey = 'home' | 'activity' | 'profile';

interface GuardianTabScreenLayoutProps {
  activeTab: GuardianTabKey;
  children: ReactNode;
}

export default function GuardianTabScreenLayout({
  activeTab,
  children,
}: GuardianTabScreenLayoutProps) {
  const navigation = useNavigation();

  const handleGoHome = () => {
    navigation.navigate('GuardianHome');
  };

  const handleGoActivity = () => {
    navigation.navigate('GuardianActivityList');
  };

  const handleGoProfile = () => {
    navigation.navigate('GuardianProfile');
  };

  return (
    <View style={styles.container}>
      {/* Universal Sticky Header */}
      <View style={styles.appHeader}>
        <Pressable onPress={handleGoHome} style={styles.wordmark}>
          <View style={styles.wordmarkIcon}>
            <Shield size={16} color={colors.white} />
          </View>
          <Text style={styles.wordmarkText}>실버비전</Text>
        </Pressable>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>보호자 관제센터</Text>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      {/* Unified Global Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressedOpacity]}
        >
          <House
            size={24}
            color={activeTab === 'home' ? colors.primary : colors.inactiveIcon}
            strokeWidth={2.5}
          />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>홈</Text>
        </Pressable>

        <Pressable
          onPress={handleGoActivity}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressedOpacity]}
        >
          <Users
            size={24}
            color={activeTab === 'activity' ? colors.primary : colors.inactiveIcon}
            strokeWidth={2.5}
          />
          <Text style={[styles.tabLabel, activeTab === 'activity' && styles.tabLabelActive]}>
            활동 기록
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoProfile}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressedOpacity]}
        >
          <User
            size={24}
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
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
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
    fontSize: guardianFontSizes.heading,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusPillText: {
    fontSize: guardianFontSizes.small,
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
    minWidth: 64,
    minHeight: GUARDIAN_MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabLabel: {
    fontSize: guardianFontSizes.small,
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
