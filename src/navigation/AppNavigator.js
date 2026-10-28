import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClipboardList, History, Settings as SettingsIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../utils/AuthContext';
import { colors } from '../theme/colors';
import { getTabBarHeight } from '../theme/layout';
import HeaderBar from '../components/HeaderBar';

import PinLoginScreen from '../screens/PinLoginScreen';
import SheetScreen from '../screens/SheetScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BarSettingsScreen from '../screens/BarSettingsScreen';
import CashiersScreen from '../screens/CashiersScreen';
import AboutScreen from '../screens/AboutScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = { Today: ClipboardList, History, Settings: SettingsIcon };

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <HeaderBar />,
        tabBarActiveTintColor: colors.bottomNavActive,
        tabBarInactiveTintColor: colors.bottomNavFg,
        tabBarStyle: {
          backgroundColor: colors.bottomNavBg,
          height: getTabBarHeight(insets),
          paddingBottom: insets.bottom + 5,
          paddingTop: 6 + 3,
        },
        tabBarIcon: ({ color, size }) => {
          const Icon = TAB_ICONS[route.name];
          return Icon ? <Icon color={color} size={size} /> : null;
        },
      })}
    >
      <Tab.Screen name="Today" component={SheetScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading, isLoggedIn } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bottomNavBg }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <PinLoginScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="SheetDetail" component={SheetScreen} options={{ header: () => <HeaderBar /> }} />
        <Stack.Screen name="BarSettings" component={BarSettingsScreen} options={{ header: () => <HeaderBar /> }} />
        <Stack.Screen name="Cashiers" component={CashiersScreen} options={{ header: () => <HeaderBar /> }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ header: () => <HeaderBar /> }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
