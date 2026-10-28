import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';

export default function BiometricToggle() {
  const { biometricSupported, biometricEnabled, setBiometricEnabled, authenticate } = useAuth();
  const c = useZbsColors();
  const [error, setError] = useState(null);
  const styles = makeStyles(c);

  async function toggle(next) {
    setError(null);
    if (!next) {
      await setBiometricEnabled(false);
      return;
    }
    // Confirm it actually works on this phone before turning it on, so nobody locks themselves out.
    if (await authenticate('Confirm to turn on biometric unlock')) await setBiometricEnabled(true);
    else setError("Couldn't confirm with Face ID / fingerprint, so it's still off.");
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.title}>Biometric unlock on this phone</Text>
          <Text style={styles.hint}>
            {biometricSupported
              ? 'Ask for Face ID / fingerprint every time the app opens or comes back from the background.'
              : 'Set up Face ID or a fingerprint in your phone settings to use this.'}
          </Text>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={toggle}
          disabled={!biometricSupported}
          trackColor={{ true: c.accent, false: c.card2 }}
          thumbColor={c.muted}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 16, marginTop: 28 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    flex1: { flex: 1 },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    hint: { fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 17 },
    error: { color: c.neg, fontSize: 13, fontWeight: '600', marginTop: 10 },
  });
}
