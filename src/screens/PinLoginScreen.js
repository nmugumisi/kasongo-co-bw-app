import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pinLogin } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { getOrCreateDeviceId } from '../utils/auth';
import NumericKeypad from '../components/NumericKeypad';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function PinLoginScreen() {
  const insets = useSafeAreaInsets();
  const { logIn } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(fullPin) {
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

  function handleKey(key) {
    if (submitting) return;
    setError(null);
    if (key === 'back') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => {
      const next = (p + key).slice(0, 4);
      if (next.length === 4) submit(next);
      return next;
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Image source={require('../../assets/kasongo-icon.png')} style={styles.logo} />
      <Text style={styles.title}>Kasongo</Text>
      <Text style={styles.subtitle}>{submitting ? 'Checking…' : 'Enter your passcode'}</Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : <View style={styles.errorSpacer} />}

      <NumericKeypad onPress={handleKey} disabled={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bottomNavBg, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 12 },
  title: { fontSize: 26, fontFamily: FONTS.lato, color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: colors.bottomNavFg, marginTop: 6, marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.bottomNavFg },
  dotFilled: { backgroundColor: colors.brand, borderColor: colors.brand },
  error: { color: '#E8A3A3', fontFamily: FONTS.regular, fontSize: 13, marginBottom: 12, height: 18 },
  errorSpacer: { height: 30 },
});
