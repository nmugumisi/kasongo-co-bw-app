import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import { requestAccountDeletion } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';

export default function AccountPanel() {
  const { user, settings, logOut, canManage, biometricSupported, biometricEnabled, setBiometricEnabled, authenticate } = useAuth();
  const c = useZbsColors();
  const [bioError, setBioError] = useState(null);

  async function toggleBiometric(next) {
    setBioError(null);
    if (!next) {
      await setBiometricEnabled(false);
      return;
    }
    // Confirm it actually works on this device before turning it on, so nobody locks themselves out.
    if (await authenticate('Confirm to turn on biometric unlock')) await setBiometricEnabled(true);
    else setBioError("Couldn't confirm with Face ID / fingerprint, so it's still off.");
  }
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const styles = makeStyles(c);

  async function handleSubmit() {
    if (!confirmed) {
      setError("Tick the box to confirm you want your account deleted.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestAccountDeletion({ message: message.trim() });
      setDone(true);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.main}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.sub}>{settings.bar_name}</Text>
      </View>

      {canManage ? (
        <View style={[styles.card, { marginTop: 10 }]}>
          <View style={styles.bioRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bioTitle}>Biometric unlock</Text>
              <Text style={styles.bioHint}>
                {biometricSupported
                  ? 'Ask for Face ID / fingerprint every time the app opens or comes back from the background.'
                  : 'Set up Face ID or a fingerprint in your phone settings to use this.'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!biometricSupported}
              trackColor={{ true: c.accent, false: c.card2 }}
              thumbColor={c.muted}
            />
          </View>
          {bioError ? <Text style={styles.error}>{bioError}</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.signOutBtn} onPress={logOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.sectionH}>Danger zone</Text>

      {done ? (
        <View style={[styles.card, { backgroundColor: c.posBg, borderColor: 'transparent' }]}>
          <Text style={[styles.doneTitle, { color: c.pos }]}>Request received.</Text>
          <Text style={[styles.doneBody, { color: c.pos }]}>
            We'll action it within 30 days. If you have an email on file, we've sent you a confirmation.
          </Text>
        </View>
      ) : !open ? (
        <TouchableOpacity style={[styles.dangerLink]} onPress={() => setOpen(true)}>
          <Text style={[styles.dangerLinkText, { color: c.neg }]}>Delete my account</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.card}>
          <Text style={styles.deleteTitle}>What we delete</Text>
          <Text style={styles.deleteBody}>Your sign-in: username, email address and passcode, and any fingerprint/face login setting.</Text>
          <Text style={[styles.deleteTitle, { marginTop: 10 }]}>What we keep</Text>
          <Text style={styles.deleteBody}>
            Stock sheets, deliveries, notes and change history you recorded stay in the bar's business records, still
            showing your name, so the records stay accurate.
          </Text>

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Anything else we should know (optional)"
            placeholderTextColor={c.muted}
            multiline
          />

          <View style={styles.switchRow}>
            <Switch value={confirmed} onValueChange={setConfirmed} trackColor={{ true: c.neg, false: c.card2 }} thumbColor={c.muted} />
            <Text style={styles.switchLabel}>I want my account deleted. I understand I won't be able to sign in afterwards.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: c.neg }]} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.deleteBtnText}>{submitting ? 'Sending…' : 'Request account deletion'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    main: { padding: 14, paddingTop: 4 },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 16 },
    name: { fontSize: 16, fontWeight: '700', color: c.text },
    sub: { fontSize: 13, color: c.muted, marginTop: 2 },
    bioRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bioTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    bioHint: { fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 17 },
    signOutBtn: { height: 48, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    signOutText: { fontSize: 15, fontWeight: '600', color: c.text },
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginTop: 26, marginBottom: 10 },
    dangerLink: { paddingVertical: 10 },
    dangerLinkText: { fontSize: 15, fontWeight: '600' },
    deleteTitle: { fontSize: 13, fontWeight: '700', color: c.text },
    deleteBody: { fontSize: 13, color: c.muted, marginTop: 4, lineHeight: 19 },
    input: {
      marginTop: 14,
      minHeight: 60,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.bg2,
      color: c.text,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
    switchLabel: { flex: 1, fontSize: 13, color: c.text, lineHeight: 18 },
    error: { color: c.neg, fontSize: 13, fontWeight: '600', marginTop: 10 },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    cancelBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: c.muted },
    deleteBtn: { flex: 2, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    doneTitle: { fontSize: 15, fontWeight: '700' },
    doneBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  });
}
