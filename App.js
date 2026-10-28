import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

function Chrome() {
  const { theme } = useAuth();
  return <StatusBar style={theme === 'light' ? 'dark' : 'light'} backgroundColor="transparent" translucent={false} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <Chrome />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
