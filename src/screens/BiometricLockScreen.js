import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { DARK } from '../theme/zbsColors';

const c = DARK;

export default function BiometricLockScreen() {
  const { user, settings, unlockWithBiometrics, logOut } = useAuth();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function tryUnlock() {
    setBusy(true);
    setFailed(false);
    const ok = await unlockWithBiometrics();
    if (!ok) setFailed(true);
    setBusy(false);
  }

  // Prompt straight away so unlocking feels like opening the app, not an extra step.
  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{settings?.bar_name || 'Bar Stock'}</Text>
      <Text style={styles.sub}>{user?.name}</Text>
      <Text style={[styles.msg, failed && styles.msgBad]}>
        {busy ? 'Waiting for Face ID / fingerprint…' : failed ? "Didn't unlock. Try again." : 'Locked'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={tryUnlock} disabled={busy}>
        <Text style={styles.buttonText}>Unlock</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={logOut}>
        <Text style={styles.linkText}>Sign out and use your password instead</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: c.text, textAlign: 'center' },
  sub: { fontSize: 14, color: c.muted, marginTop: 2 },
  msg: { fontSize: 14, color: c.muted, marginTop: 24, marginBottom: 18, textAlign: 'center', minHeight: 20 },
  msgBad: { color: c.neg, fontWeight: '600' },
  button: { width: '100%', maxWidth: 340, backgroundColor: c.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '700', fontSize: 16, color: c.accentInk },
  link: { marginTop: 26 },
  linkText: { color: c.muted, fontSize: 14, fontWeight: '600' },
});
