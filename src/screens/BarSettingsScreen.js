import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { saveSettings } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function BarSettingsScreen() {
  const { settings, refreshSettings } = useAuth();
  const [barName, setBarName] = useState(settings.bar_name);
  const [currency, setCurrency] = useState(settings.currency);
  const [showValues, setShowValues] = useState(settings.show_values);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings({ bar_name: barName, currency, show_values: showValues });
      await refreshSettings();
      Alert.alert('Saved', 'Bar settings updated.');
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bar settings</Text>

      <Text style={styles.label}>Bar name</Text>
      <TextInput style={styles.input} value={barName} onChangeText={setBarName} maxLength={80} />

      <Text style={styles.label}>Currency symbol</Text>
      <TextInput style={styles.input} value={currency} onChangeText={setCurrency} maxLength={6} placeholder="e.g. P" />

      <View style={styles.switchRow}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Show money values</Text>
          <Text style={styles.hint}>Prices and shortage value, not just quantities.</Text>
        </View>
        <Switch value={showValues} onValueChange={setShowValues} trackColor={{ true: colors.brand }} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: colors.ink, marginBottom: 20 },
  label: { fontSize: 14, fontFamily: FONTS.medium, color: colors.ink, marginBottom: 8 },
  hint: { fontSize: 12, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: colors.ink,
    backgroundColor: colors.card,
    marginBottom: 18,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  flex1: { flex: 1 },
  button: { backgroundColor: colors.brand, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 16, color: '#fff' },
});
