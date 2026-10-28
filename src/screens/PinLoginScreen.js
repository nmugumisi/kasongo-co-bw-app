import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  StyleSheet,
} from 'react-native';
import { pinLogin, accountLogin } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { getOrCreateDeviceId } from '../utils/auth';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import NumericKeypad from '../components/NumericKeypad';
import { DARK } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';

const c = DARK;

export default function PinLoginScreen() {
  const { logIn, settings } = useAuth();
  const cushion = useBottomCushion(40);
  const isOnline = useNetworkStatus();
  const [mode, setMode] = useState('pin'); // 'pin' | 'account'
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  function runShake() {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function submitPin(fullPin) {
    if (!isOnline) {
      setError("You're offline. Connect to the internet to sign in for the first time on this device.");
      setPin('');
      runShake();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const device = await getOrCreateDeviceId();
      const result = await pinLogin({ pin: fullPin, device });
      await logIn(result);
    } catch (e) {
      setError(e.message || 'Wrong passcode.');
      setPin('');
      runShake();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAccount() {
    if (!isOnline) {
      setError("You're offline. Connect to the internet to sign in for the first time on this device.");
      return;
    }
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
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: cushion }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{settings?.bar_name || 'Bar Stock'}</Text>

        {mode === 'pin' ? (
          <>
            <Text style={[styles.msg, error && styles.msgBad]}>
              {error || (submitting ? 'Checking…' : !isOnline ? "You're offline — connect to sign in" : 'Enter your passcode')}
            </Text>

            <Animated.View
              style={[
                styles.dots,
                {
                  transform: [
                    {
                      translateX: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-10, 0, 10] }),
                    },
                  ],
                },
              ]}
            >
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
              ))}
            </Animated.View>

            <NumericKeypad onPress={handleKey} disabled={submitting} />

            <TouchableOpacity onPress={() => switchMode('account')} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>Manager or admin sign-in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.form}>
            <Text style={styles.msg}>{!isOnline ? "You're offline — connect to sign in" : 'Manager or admin sign-in'}</Text>
            {error ? <Text style={[styles.msg, styles.msgBad]}>{error}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={[styles.input, styles.inputSpacing]}
              placeholder="Password"
              placeholderTextColor={c.muted}
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
  flex: { flex: 1, backgroundColor: c.bg },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, paddingHorizontal: 24, paddingVertical: 40 },
  title: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 4, textAlign: 'center' },
  msg: { fontSize: 14, color: c.muted, marginTop: 6, marginBottom: 18, textAlign: 'center', minHeight: 20 },
  msgBad: { color: c.neg, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: c.muted },
  dotFilled: { backgroundColor: c.accent, borderColor: c.accent },
  switchLink: { marginTop: 28, paddingVertical: 8, paddingHorizontal: 12 },
  switchLinkText: { color: c.muted, fontSize: 14, fontWeight: '600' },
  form: { width: '100%', maxWidth: 340, alignItems: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.bg2,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 16,
    color: c.text,
  },
  inputSpacing: { marginTop: 10 },
  button: { width: '100%', backgroundColor: c.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { fontWeight: '700', fontSize: 16, color: c.accentInk },
});
