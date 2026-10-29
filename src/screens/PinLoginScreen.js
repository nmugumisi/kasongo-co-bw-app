import React, { useEffect, useRef, useState } from 'react';
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
import { pinLogin, accountLogin, checkDevices } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { getOrCreateDeviceId, getLinks, saveLinks, getLinkBar, setLinkBar } from '../utils/auth';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import NumericKeypad from '../components/NumericKeypad';
import SignUpFlow from '../components/SignUpFlow';
import DeviceLinkFlow from '../components/DeviceLinkFlow';
import { DARK } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';

const c = DARK;

export default function PinLoginScreen() {
  const { logIn } = useAuth();
  const cushion = useBottomCushion(40);
  const isOnline = useNetworkStatus();
  const [mode, setMode] = useState('pin'); // 'pin' | 'account' | 'signup' | 'link'
  // Bars this phone is linked to. Passcodes are looked up only in the chosen one.
  const [links, setLinks] = useState([]);
  const [barId, setBarId] = useState(0);
  const [open, setOpen] = useState(true); // some bar still takes passcodes from unlinked phones
  const [linkNote, setLinkNote] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const current = links.find((l) => l.bar.id === barId) || links[0] || null;

  async function storeLinks(list, bar) {
    const cur = list.find((l) => l.bar.id === bar) || list[0] || null;
    setLinks(list);
    setBarId(cur ? cur.bar.id : 0);
    await saveLinks(list);
    await setLinkBar(cur ? cur.bar.id : 0);
  }

  // On opening: drop links a manager has since unlinked, and learn whether this phone can work unlinked.
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getLinks();
      const bar = await getLinkBar();
      if (!alive) return;
      setLinks(list);
      setBarId(bar);
      try {
        const r = await checkDevices(list.map((l) => l.token));
        if (!alive) return;
        const gone = [];
        const kept = list.filter((l, i) => {
          const d = r.devices[i];
          if (d?.ok) {
            l.bar = d.bar;
            l.device = d.device;
            return true;
          }
          gone.push(l.bar.name);
          return false;
        });
        setOpen(!!r.open);
        await storeLinks(kept, bar);
        if (gone.length) setError(`This phone was unlinked from ${gone.join(', ')}.`);
        if (!kept.length && !r.open) {
          setLinkNote(gone.length ? `This phone was unlinked from ${gone.join(', ')}. Ask a manager for a new code.` : null);
          setMode('link');
        }
      } catch {
        // offline: the keypad still shows; the server checks the link when online
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLinked(r) {
    const list = links.filter((l) => l.bar.id !== r.bar.id).concat([{ token: r.device_token, bar: r.bar, device: r.device }]);
    await storeLinks(list, r.bar.id);
    setLinkNote(null);
    setPin('');
    setMode('pin');
    setError(null);
    setNotice(`Linked to ${r.bar.name}. Enter your passcode`);
  }

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
      const result = await pinLogin({ pin: fullPin, device, device_token: current?.token || '' });
      await logIn(result);
    } catch (e) {
      const code = e.data?.code;
      if (code === 'zbs_device_unlinked' && current) {
        const rest = links.filter((l) => l !== current);
        await storeLinks(rest, 0);
        if (!rest.length && !open) {
          setLinkNote(`This phone was unlinked from ${current.bar.name}. Ask a manager for a new code.`);
          setMode('link');
        } else setError(`This phone was unlinked from ${current.bar.name}.`);
        setPin('');
        return;
      }
      if (code === 'zbs_device_required') {
        setOpen(false);
        setLinkNote(e.message);
        setPin('');
        setMode('link');
        return;
      }
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
    setNotice(null);
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
    setNotice(null);
    setLinkNote(null);
    setPin('');
    setMode(next);
  }

  function pickBar(id) {
    if (submitting) return;
    setPin('');
    setError(null);
    setNotice(null);
    storeLinks(links, id);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: cushion }]} keyboardShouldPersistTaps="handled">
        {mode === 'pin' || mode === 'account' ? <Text style={styles.title}>Kasongo</Text> : null}
        {/* The bar this phone takes passcodes for, when it's linked to just one (more: the chips below). */}
        {mode === 'pin' && links.length === 1 ? <Text style={styles.barLine}>{current.bar.name}</Text> : null}

        {mode === 'pin' && links.length > 1 ? (
          <View style={styles.bars}>
            {links.map((l) => (
              <TouchableOpacity key={l.bar.id} onPress={() => pickBar(l.bar.id)} style={[styles.barChip, l.bar.id === current?.bar.id && styles.barChipOn]}>
                <Text style={[styles.barChipText, l.bar.id === current?.bar.id && styles.barChipTextOn]}>{l.bar.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {mode === 'pin' ? (
          <>
            <Text style={[styles.msg, error && styles.msgBad]}>
              {error || (submitting ? 'Checking…' : !isOnline ? "You're offline — connect to sign in" : notice || 'Enter your passcode')}
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

            <TouchableOpacity onPress={() => switchMode('link')} style={styles.linkDev}>
              <Text style={styles.linkDevText}>{links.length ? 'Link another bar' : 'Link this phone to a bar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchMode('account')} style={styles.switchLinkTight}>
              <Text style={styles.switchLinkText}>Manager or admin sign-in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchMode('signup')} style={styles.signupLink}>
              <Text style={styles.signupLinkText}>New bar? Create an account</Text>
            </TouchableOpacity>
          </>
        ) : mode === 'signup' ? (
          <SignUpFlow onCancel={() => switchMode('pin')} />
        ) : mode === 'link' ? (
          <>
            <DeviceLinkFlow key={linkNote || 'link'} note={linkNote} onLinked={onLinked} onCancel={links.length || open ? () => switchMode('pin') : null} />
            {!links.length && !open ? (
              <>
                <TouchableOpacity onPress={() => switchMode('account')} style={styles.switchLink}>
                  <Text style={styles.switchLinkText}>Manager or admin sign-in</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => switchMode('signup')} style={styles.signupLink}>
                  <Text style={styles.signupLinkText}>New bar? Create an account</Text>
                </TouchableOpacity>
              </>
            ) : null}
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
  barLine: { fontSize: 15, fontWeight: '600', color: c.accent, textAlign: 'center' },
  msg: { fontSize: 14, color: c.muted, marginTop: 6, marginBottom: 18, textAlign: 'center', minHeight: 20 },
  msgBad: { color: c.neg, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: c.muted },
  dotFilled: { backgroundColor: c.accent, borderColor: c.accent },
  bars: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  barChip: { borderWidth: 1, borderColor: c.line, backgroundColor: c.bg2, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  barChipOn: { backgroundColor: c.accent, borderColor: c.accent },
  barChipText: { color: c.text, fontSize: 14, fontWeight: '600' },
  barChipTextOn: { color: c.accentInk },
  linkDev: { marginTop: 22, paddingVertical: 8, paddingHorizontal: 12 },
  linkDevText: { color: c.muted, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  switchLink: { marginTop: 28, paddingVertical: 8, paddingHorizontal: 12 },
  switchLinkTight: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 12 },
  switchLinkText: { color: c.muted, fontSize: 14, fontWeight: '600' },
  signupLink: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 12 },
  signupLinkText: { color: c.accent, fontSize: 14, fontWeight: '600' },
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
