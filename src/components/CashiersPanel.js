import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCashiers, createCashier, updateCashier, deleteCashier } from '../services/api';
import { useZbsColors } from '../theme/zbsColors';
import { useAuth } from '../utils/AuthContext';
import { useBottomCushion } from '../theme/layout';
import { IconClose } from '../theme/zbsIcons';
import ManagersSection from './ManagersSection';
import DevicesSection from './DevicesSection';

export default function CashiersPanel() {
  const c = useZbsColors();
  const { readOnly } = useAuth();
  const cushion = useBottomCushion(24);
  const [cashiers, setCashiers] = useState(null);
  const [panelId, setPanelId] = useState(undefined); // undefined=closed, null=new, number=edit
  const styles = makeStyles(c);

  const load = useCallback(async () => {
    try {
      setCashiers(await getCashiers());
    } catch {
      setCashiers((s) => s ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const editing = panelId !== undefined && panelId !== null ? cashiers?.find((x) => x.id === panelId) : null;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: cushion }]}>
        {readOnly ? null : (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={() => setPanelId(null)}>
            <Text style={[styles.addBtnText, { color: c.accentInk }]}>+ Add cashier</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.hint}>Cashiers sign in with a 4-digit passcode only. Each passcode must be different.</Text>

        <Text style={styles.sectionH}>Cashiers{cashiers ? ` · ${cashiers.length}` : ''}</Text>
        {!cashiers ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 10 }} />
        ) : !cashiers.length ? (
          <Text style={styles.empty}>No cashiers yet. Add the first one above.</Text>
        ) : (
          <View style={styles.list}>
            {cashiers.map((ch) => (
              <TouchableOpacity key={ch.id} style={[styles.row, ch.disabled && styles.rowOff]} onPress={() => setPanelId(ch.id)}>
                <View style={[styles.avatar, { backgroundColor: `${c.accent}38` }]}>
                  <Text style={[styles.avatarText, { color: c.text }]}>{(ch.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.rowName}>{ch.name}</Text>
                  <Text style={styles.rowMeta}>{ch.last ? `Last in ${ch.last}` : 'Never signed in'}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: ch.disabled ? c.warnBg : c.posBg }]}>
                  <Text style={[styles.pillText, { color: ch.disabled ? c.warn : c.pos }]}>{ch.disabled ? 'Disabled' : 'Active'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ManagersSection />
        <DevicesSection />
      </ScrollView>

      <CashierModal
        visible={panelId !== undefined}
        cashier={editing}
        onClose={() => setPanelId(undefined)}
        onSaved={load}
      />
    </View>
  );
}

function CashierModal({ visible, cashier, onClose, onSaved }) {
  const c = useZbsColors();
  const { readOnly } = useAuth();
  const cushion = useBottomCushion(24);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const styles = makeStyles(c);

  React.useEffect(() => {
    if (visible) {
      setName('');
      setPin('');
      setError(null);
    }
  }, [visible, cashier?.id]);

  if (!visible) return null;

  async function handleSubmit() {
    if (!/^\d{4}$/.test(pin)) {
      setError('The passcode must be exactly 4 digits.');
      return;
    }
    if (!cashier && !name.trim()) {
      setError("Enter the cashier's name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (cashier) await updateCashier(cashier.id, { pin });
      else await createCashier({ name: name.trim(), pin });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleToggle() {
    const verb = cashier.disabled ? 'Enable' : 'Disable';
    Alert.alert(
      `${verb} ${cashier.name}?`,
      cashier.disabled ? undefined : `${cashier.name} will be signed out everywhere and their passcode will stop working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: verb,
          style: cashier.disabled ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateCashier(cashier.id, { disabled: !cashier.disabled });
              await onSaved();
              onClose();
            } catch (e) {
              Alert.alert('Could not update', e.message || 'Something went wrong.');
            }
          },
        },
      ]
    );
  }

  function handleRemove() {
    Alert.alert('Remove cashier?', `${cashier.name}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCashier(cashier.id);
            await onSaved();
            onClose();
          } catch (e) {
            Alert.alert('Could not remove', e.message || 'Something went wrong.');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <Text style={styles.title}>{cashier ? cashier.name : 'Add cashier'}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>

          {!cashier ? (
            <>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} placeholder="e.g. Tendai" placeholderTextColor={c.muted} />
            </>
          ) : null}

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{cashier ? 'New passcode' : '4-digit passcode'}</Text>
          <TextInput
            style={[styles.input, styles.pinInput]}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={c.muted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {readOnly ? null : (
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent }]} onPress={handleSubmit} disabled={submitting}>
              <Text style={[styles.saveBtnText, { color: c.accentInk }]}>
                {submitting ? 'Saving…' : cashier ? 'Change passcode' : 'Add cashier'}
              </Text>
            </TouchableOpacity>
          )}

          {cashier && !readOnly ? (
            <View style={styles.panelActions}>
              <TouchableOpacity style={styles.panelBtn} onPress={handleToggle}>
                <Text style={styles.panelBtnText}>{cashier.disabled ? `Enable ${cashier.name}` : `Disable ${cashier.name}`}</Text>
              </TouchableOpacity>
              {cashier.can_remove ? (
                <TouchableOpacity style={[styles.panelBtn, styles.dangerBtn]} onPress={handleRemove}>
                  <Text style={[styles.panelBtnText, { color: c.neg }]}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.hint}>Has stock history, so it can be disabled but not removed.</Text>
              )}
            </View>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1 },
    main: { padding: 14 },
    addBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontSize: 16, fontWeight: '700' },
    hint: { fontSize: 12, color: c.muted, marginTop: 10 },
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginTop: 22, marginBottom: 10 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 20 },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    rowOff: { opacity: 0.6 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontWeight: '800', fontSize: 15 },
    flex1: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15, fontWeight: '700', color: c.text },
    rowMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
    pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    pillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 28 },
    grab: { width: 42, height: 5, borderRadius: 5, backgroundColor: c.card2, alignSelf: 'center', marginBottom: 8 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    title: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, color: c.text, fontSize: 16 },
    pinInput: { fontFamily: 'monospace', fontSize: 24, letterSpacing: 8, textAlign: 'center' },
    error: { color: c.neg, fontSize: 14, fontWeight: '600', marginTop: 10 },
    saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    saveBtnText: { fontSize: 16, fontWeight: '700' },
    panelActions: { gap: 8, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line },
    panelBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    panelBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
    dangerBtn: { borderColor: `${c.neg}66` },
  });
}
