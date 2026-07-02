import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

import EntryScreen from '../screens/common/EntryScreen';
import LoginScreen from '../screens/common/LoginScreen';
import AddWardScreen from '../screens/guardian/AddWardScreen';
import ActivityRecordScreen from '../screens/guardian/ActivityRecordScreen';
import GuardianHomeScreen from '../screens/guardian/GuardianHomeScreen';
import GuardianProfileScreen from '../screens/guardian/GuardianProfileScreen';
import ExerciseListScreen from '../screens/senior/ExerciseListScreen';
import SeniorHomeScreen from '../screens/senior/SeniorHomeScreen';
import SeniorProfileScreen from '../screens/senior/SeniorProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Entry"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Entry" component={EntryScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SeniorHome" component={SeniorHomeScreen} />
      <Stack.Screen name="ExerciseList" component={ExerciseListScreen} />
      <Stack.Screen name="SeniorProfile" component={SeniorProfileScreen} />
      <Stack.Screen name="GuardianHome" component={GuardianHomeScreen} />
      <Stack.Screen name="ActivityRecord" component={ActivityRecordScreen} />
      <Stack.Screen name="AddWard" component={AddWardScreen} />
      <Stack.Screen name="GuardianProfile" component={GuardianProfileScreen} />
    </Stack.Navigator>
  );
}