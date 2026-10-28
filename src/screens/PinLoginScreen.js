import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pinLogin, accountLogin } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { getOrCreateDeviceId } from '../utils/auth';
import NumericKeypad from '../components/NumericKeypad';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function PinLoginScreen() {
  const insets = useSafeAreaInsets();
  const { logIn } = useAuth();
  const [mode, setMode] = useState('pin'); // 'pin' | 'account'
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitPin(fullPin) {
    setSubmitting(true);
    setError(null);
    try {
      const device = await getOrCreateDeviceId();
      const result = await pinLogin({ pin: fullPin, device });
      await logIn(result);
    } catch (e) {
      setError(e.message || 'Wrong passcode.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAccount() {
    if (!username || !password) {
      setError('Enter your username and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await accountLogin({ username, password });
      await logIn(result);
    } catch (e) {
      setError(e.message || 'Wrong username or password.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleKey(key) {
    if (submitting) return;
    setError(null);
    if (key === 'back') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => {
      const next = (p + key).slice(0, 4);
      if (next.length === 4) submitPin(next);
      return next;
    });
  }

  function switchMode(next) {
    setError(null);
    setPin('');
    setMode(next);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={require('../../assets/kasongo-icon.png')} style={styles.logo} />
        <Text style={styles.title}>Kasongo</Text>
        <Text style={styles.subtitle}>
          {submitting ? 'Checking…' : mode === 'pin' ? 'Enter your passcode' : 'Manager or admin sign-in'}
        </Text>

        {mode === 'pin' ? (
          <>
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorSpacer} />}

            <NumericKeypad onPress={handleKey} disabled={submitting} />

            <TouchableOpacity onPress={() => switchMode('account')} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>Manager or admin sign-in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.form}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#8A8375"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={[styles.input, styles.inputSpacing]}
              placeholder="Password"
              placeholderTextColor="#8A8375"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={submitAccount} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switchMode('pin')} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>Use a passcode instead</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bottomNavBg },
  container: { flexGrow: 1, alignItems: 'center', backgroundColor: colors.bottomNavBg, paddingHorizontal: 24 },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 12 },
  title: { fontSize: 26, fontFamily: FONTS.lato, color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: colors.bottomNavFg, marginTop: 6, marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.bottomNavFg },
  dotFilled: { backgroundColor: colors.brand, borderColor: colors.brand },
  error: { color: '#E8A3A3', fontFamily: FONTS.regular, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  errorSpacer: { height: 30 },
  switchLink: { marginTop: 24 },
  switchLinkText: { color: colors.bottomNavFg, fontFamily: FONTS.regular, fontSize: 13, textDecorationLine: 'underline' },
  form: { width: '100%' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#3A362E',
    backgroundColor: '#2A2620',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: '#fff',
  },
  inputSpacing: { marginTop: 12 },
  button: { backgroundColor: colors.brand, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
});
