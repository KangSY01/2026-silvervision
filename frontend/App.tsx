import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/context/AppStateContext';
import { RootStackParamList } from './src/navigation/types';
import EntryScreen from './src/screens/common/EntryScreen';
import LoginScreen from './src/screens/common/LoginScreen';
import ExerciseFeedbackScreen from './src/screens/senior/ExerciseFeedbackScreen';
import ExerciseProgressScreen from './src/screens/senior/ExerciseProgressScreen';
import ExerciseSelectScreen from './src/screens/senior/ExerciseSelectScreen';
import ProfileScreen from './src/screens/senior/ProfileScreen';
import AddSeniorScreen from './src/screens/guardian/AddSeniorScreen';
import AlertDetailScreen from './src/screens/guardian/AlertDetailScreen';
import AlertHistoryScreen from './src/screens/guardian/AlertHistoryScreen';
import GuardianActivityListScreen from './src/screens/guardian/GuardianActivityListScreen';
import GuardianHomeScreen from './src/screens/guardian/GuardianHomeScreen';
import GuardianLoginScreen from './src/screens/guardian/GuardianLoginScreen';
import GuardianProfileScreen from './src/screens/guardian/GuardianProfileScreen';
import GuardianSignupScreen from './src/screens/guardian/GuardianSignupScreen';
import SeniorDetailScreen from './src/screens/guardian/SeniorDetailScreen';
import SeniorHomeScreen from './src/screens/senior/SeniorHomeScreen';
import SignupScreen from './src/screens/senior/SignupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.webContainer}>
        <AppStateProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Entry" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Entry" component={EntryScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="SeniorHome" component={SeniorHomeScreen} />
              <Stack.Screen name="ExerciseSelect" component={ExerciseSelectScreen} />
              <Stack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
              <Stack.Screen name="ExerciseFeedback" component={ExerciseFeedbackScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="GuardianLogin" component={GuardianLoginScreen} />
              <Stack.Screen name="GuardianSignup" component={GuardianSignupScreen} />
              <Stack.Screen name="GuardianHome" component={GuardianHomeScreen} />
              <Stack.Screen name="GuardianActivityList" component={GuardianActivityListScreen} />
              <Stack.Screen name="AddSenior" component={AddSeniorScreen} />
              <Stack.Screen name="SeniorDetail" component={SeniorDetailScreen} />
              <Stack.Screen name="GuardianProfile" component={GuardianProfileScreen} />
              <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
              <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AppStateProvider>
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}

// 웹 프리뷰에서만 모바일 화면 폭(430px)으로 제한해 중앙 정렬한다. 네이티브(iOS/Android)에는 영향 없음.
const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    ...(Platform.OS === 'web' ? { maxWidth: 430, width: '100%', alignSelf: 'center' } : null),
  },
});
