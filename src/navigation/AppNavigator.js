import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';

import PinLoginScreen from '../screens/PinLoginScreen';
import BiometricLockScreen from '../screens/BiometricLockScreen';
import HomeScreen from '../screens/HomeScreen';
import SheetScreen from '../screens/SheetScreen';
import ReviewScreen from '../screens/ReviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AskScreen from '../screens/AskScreen';
import PlatformScreen from '../screens/PlatformScreen';
import ViewBanner from '../components/ViewBanner';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { loading, isLoggedIn, locked, theme, barId, isVerifier, viewAs } = useAuth();
  const insets = useSafeAreaInsets();
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

  // A Verifier with no bar of their own lands on the Bars screen (an admin who also works at a bar gets
  // Home, with Bars a tap away). Viewing a bar as support shows that bar's screens, read-only.
  const platform = isVerifier && !viewAs && !barId;

  const nav = (
    // Keyed on the bar: switching bars (or starting or ending a support view) starts again from the
    // first screen, with nothing left over from before.
    <NavigationContainer key={viewAs ? `view-${viewAs.bar}` : platform ? 'platform' : barId} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {platform ? (
          <>
            <Stack.Screen name="Platform" component={PlatformScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Sheet" component={SheetScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            {viewAs ? null : <Stack.Screen name="Ask" component={AskScreen} />}
            {isVerifier && !viewAs ? <Stack.Screen name="Platform" component={PlatformScreen} /> : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );

  if (!viewAs) return nav;
  // The banner takes the status-bar space, so the screens below it start at the top edge.
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ViewBanner top={insets.top} />
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>{nav}</SafeAreaInsetsContext.Provider>
    </View>
  );
}
