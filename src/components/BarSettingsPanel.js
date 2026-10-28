import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import { saveSettings } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';

export default function BarSettingsPanel() {
  const { settings, refreshSettings } = useAuth();
  const c = useZbsColors();
  const [barName, setBarName] = useState(settings.bar_name);
  const [currency, setCurrency] = useState(settings.currency);
  const [showValues, setShowValues] = useState(settings.show_values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const styles = makeStyles(c);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveSettings({ bar_name: barName, currency, show_values: showValues });
      await refreshSettings();
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.main}>
      <Text style={styles.label}>Bar name</Text>
      <TextInput style={styles.input} value={barName} onChangeText={setBarName} maxLength={80} placeholder="e.g. Mugumisi Sports Bar" placeholderTextColor={c.muted} />
      <Text style={styles.hint}>Shown at the top of the app, on the sign-in keypad and on every export.</Text>

      <View style={styles.switchRow}>
        <Switch value={showValues} onValueChange={setShowValues} trackColor={{ true: c.accent, false: c.card2 }} thumbColor={c.muted} />
        <Text style={styles.switchLabel}>Show money values (prices)</Text>
      </View>
      <Text style={styles.hint}>Off: everything works in quantities only. On: adds unit prices and shortage values.</Text>

      {showValues ? (
        <>
          <Text style={[styles.label, { marginTop: 14 }]}>Currency symbol</Text>
          <TextInput style={styles.input} value={currency} onChangeText={setCurrency} maxLength={6} placeholder="e.g. P" placeholderTextColor={c.muted} />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, { backgroundColor: c.accent }]} onPress={handleSave} disabled={saving}>
        <Text style={[styles.buttonText, { color: c.accentInk }]}>{saving ? 'Saving…' : 'Save bar profile'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    main: { padding: 14, paddingTop: 4 },
    label: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, color: c.text, fontSize: 16 },
    hint: { fontSize: 12, color: c.muted, marginTop: 8 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: c.text },
    error: { color: c.neg, fontSize: 14, fontWeight: '600', marginTop: 14 },
    button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    buttonText: { fontSize: 16, fontWeight: '700' },
  });
}
