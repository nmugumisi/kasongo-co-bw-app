import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';

import PinLoginScreen from '../screens/PinLoginScreen';
import BiometricLockScreen from '../screens/BiometricLockScreen';
import HomeScreen from '../screens/HomeScreen';
import SheetScreen from '../screens/SheetScreen';
import ReviewScreen from '../screens/ReviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AskScreen from '../screens/AskScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { loading, isLoggedIn, locked, theme } = useAuth();
  const c = useZbsColors();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <PinLoginScreen />;
  }

  if (locked) {
    return <BiometricLockScreen />;
  }

  const navTheme = {
    ...(theme === 'light' ? DefaultTheme : DarkTheme),
    colors: { ...(theme === 'light' ? DefaultTheme : DarkTheme).colors, background: c.bg, card: c.bg },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Sheet" component={SheetScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Ask" component={AskScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
