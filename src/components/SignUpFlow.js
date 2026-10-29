import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { signupCheck, signupStart, signupVerify } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { DARK } from '../theme/zbsColors';

const c = DARK;

// Same rule as ZBS_Bars::clean_slug on the server, so what you see is what you get.
function slugify(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * A new bar: form, then the 6-digit code from the email, then signed in. Nothing is created on the
 * server until the code is right. The bar starts pending approval; Home shows what can be set up.
 */
export default function SignUpFlow({ onCancel }) {
  const { logIn } = useAuth();
  const [step, setStep] = useState('form'); // form | code
  const [f, setF] = useState({ bar_name: '', bar_slug: '', name: '', email: '', password: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugNote, setSlugNote] = useState({ text: 'Short and unique: staff use it to find your bar.', ok: null });
  const [token, setToken] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!slugTouched) setF((p) => ({ ...p, bar_slug: slugify(p.bar_name) }));
  }, [f.bar_name, slugTouched]);

  useEffect(() => {
    const s = slugify(f.bar_slug);
    clearTimeout(timer.current);
    if (!s) return;
    if (s.length < 3) {
      setSlugNote({ text: 'At least 3 letters or numbers.', ok: false });
      return;
    }
    timer.current = setTimeout(() => {
      signupCheck(s)
        .then((r) => setSlugNote({ text: r.free ? `@${r.slug} is free` : r.message, ok: r.free }))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer.current);
  }, [f.bar_slug]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await signupStart({ ...f, bar_slug: slugify(f.bar_slug), email: f.email.trim() });
      setToken(r.token);
      setMinutes(r.minutes || 15);
      setStep('code');
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const r = await signupVerify({ token, code });
      await logIn(r); // signed in; Home shows the pending-approval setup screen
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  if (step === 'code') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to <Text style={styles.strong}>{f.email.trim()}</Text>. It works for {minutes} minutes.
        </Text>
        <TextInput
          style={[styles.input, styles.code]}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="••••••"
          placeholderTextColor={c.muted}
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={[styles.button, code.length !== 6 && styles.disabled]} onPress={verify} disabled={busy || code.length !== 6}>
          {busy ? <ActivityIndicator color={c.accentInk} /> : <Text style={styles.buttonText}>Create my bar</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setStep('form'); setCode(''); setError(null); }} style={styles.link}>
          <Text style={styles.linkText}>Start again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const field = (label, k, props = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={f[k]} onChangeText={set(k)} placeholderTextColor={c.muted} {...props} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Create a bar account</Text>
      <Text style={styles.sub}>Set up your stock list while we approve your bar. Usually within a day.</Text>
      {field('Bar name', 'bar_name', { maxLength: 80, placeholder: 'e.g. Moremi Pub' })}
      <View style={styles.field}>
        <Text style={styles.label}>Bar username</Text>
        <TextInput
          style={styles.input}
          value={f.bar_slug}
          onChangeText={(v) => {
            setSlugTouched(true);
            set('bar_slug')(v);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          placeholder="moremi-pub"
          placeholderTextColor={c.muted}
        />
        <Text style={[styles.hint, slugNote.ok === true && { color: c.pos }, slugNote.ok === false && { color: c.neg }]}>{slugNote.text}</Text>
      </View>
      {field('Your name', 'name', { maxLength: 60, autoComplete: 'name' })}
      {field('Email', 'email', { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false, autoComplete: 'email' })}
      {field('Password', 'password', { secureTextEntry: true, placeholder: 'At least 8 characters', autoComplete: 'new-password' })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={start} disabled={busy}>
        {busy ? <ActivityIndicator color={c.accentInk} /> : <Text style={styles.buttonText}>Email me a code</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={styles.link}>
        <Text style={styles.linkText}>Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 360 },
  title: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 6 },
  sub: { fontSize: 14, color: c.muted, lineHeight: 20, marginBottom: 14 },
  strong: { color: c.text, fontWeight: '700' },
  field: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: c.line, backgroundColor: c.bg2, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 16, color: c.text },
  code: { height: 60, fontSize: 26, letterSpacing: 10, textAlign: 'center', marginTop: 4 },
  hint: { fontSize: 12, color: c.muted, marginTop: 6 },
  error: { color: c.neg, fontSize: 14, fontWeight: '600', marginTop: 12 },
  button: { backgroundColor: c.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonText: { fontWeight: '700', fontSize: 16, color: c.accentInk },
  disabled: { opacity: 0.5 },
  link: { alignSelf: 'center', paddingVertical: 12, marginTop: 6 },
  linkText: { color: c.muted, fontSize: 14, fontWeight: '600' },
});
