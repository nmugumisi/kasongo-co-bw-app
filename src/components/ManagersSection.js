import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getManagers, inviteManager, resendManagerInvite, removeManager } from '../services/api';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { IconClose } from '../theme/zbsIcons';

const STATUS = { active: 'Active', invited: 'Invite sent', expired: 'Invite expired' };

/** Managers list under the cashiers on Settings › Staff. New managers are invited by email and set their own password. */
export default function ManagersSection() {
  const c = useZbsColors();
  const [managers, setManagers] = useState(null);
  const [panelId, setPanelId] = useState(undefined); // undefined=closed, null=invite, number=details
  const styles = makeStyles(c);

  const load = useCallback(async () => {
    try {
      setManagers(await getManagers());
    } catch {
      setManagers((m) => m ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = panelId ? managers?.find((m) => m.id === panelId) : null;

  return (
    <View>
      <Text style={[styles.sectionH, { marginTop: 30 }]}>Managers{managers ? ` · ${managers.length}` : ''}</Text>
      <TouchableOpacity style={styles.inviteBtn} onPress={() => setPanelId(null)}>
        <Text style={styles.inviteBtnText}>+ Invite manager</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Managers get an email to set their own password, then use "Manager or admin sign-in".</Text>

      {!managers ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 14 }} />
      ) : !managers.length ? (
        <Text style={styles.empty}>No managers yet.</Text>
      ) : (
        <View style={[styles.list, { marginTop: 12 }]}>
          {managers.map((m) => (
            <TouchableOpacity key={m.id} style={styles.row} onPress={() => setPanelId(m.id)}>
              <View style={[styles.avatar, { backgroundColor: `${c.accent}38` }]}>
                <Text style={[styles.avatarText, { color: c.text }]}>{(m.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {m.name}
                  {m.is_me ? ' (you)' : ''}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {m.status === 'active' ? (m.last ? `Last in ${m.last}` : 'Never signed in') : `Invited ${m.invited}`}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: m.status === 'active' ? c.posBg : c.warnBg }]}>
                <Text style={[styles.pillText, { color: m.status === 'active' ? c.pos : c.warn }]}>{STATUS[m.status] || 'Active'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ManagerModal visible={panelId !== undefined} manager={open} onClose={() => setPanelId(undefined)} onChanged={load} />
    </View>
  );
}

function ManagerModal({ visible, manager, onClose, onChanged }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(24);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const styles = makeStyles(c);

  useEffect(() => {
    if (visible) {
      setName('');
      setEmail('');
      setError(null);
    }
  }, [visible, manager?.id]);

  if (!visible) return null;

  async function handleInvite() {
    if (!name.trim()) return setError("Enter the manager's name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    try {
      const m = await inviteManager({ name: name.trim(), email: email.trim() });
      await onChanged();
      onClose();
      Alert.alert('Invite sent', `${m.name} will get an email at ${m.email} to set their password.`);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      if (e.data?.code === 'zbs_mail') onChanged(); // the account was made; it shows in the list for Resend
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    try {
      await resendManagerInvite(manager.id);
      await onChanged();
      onClose();
      Alert.alert('Invite sent', `A new link went to ${manager.email}. Any earlier link no longer works.`);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function handleRemove() {
    Alert.alert(`Remove ${manager.name} as a manager?`, "They'll be signed out of the app and the website.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeManager(manager.id);
            await onChanged();
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
            <Text style={styles.title} numberOfLines={1}>
              {manager ? manager.name : 'Invite manager'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>

          {manager ? (
            <>
              <Text style={styles.detail}>{manager.email}</Text>
              <Text style={styles.detailMuted}>
                Username {manager.username} · {STATUS[manager.status] || 'Active'}
                {manager.status === 'active' ? (manager.last ? ` · last in ${manager.last}` : ' · never signed in') : ` · ${manager.invited}`}
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.panelActions}>
                {manager.status !== 'active' ? (
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent, marginTop: 0 }]} onPress={handleResend} disabled={busy}>
                    <Text style={[styles.saveBtnText, { color: c.accentInk }]}>{busy ? 'Sending…' : 'Resend invite'}</Text>
                  </TouchableOpacity>
                ) : null}
                {!manager.is_me ? (
                  <TouchableOpacity style={[styles.panelBtn, styles.dangerBtn]} onPress={handleRemove} disabled={busy}>
                    <Text style={[styles.panelBtnText, { color: c.neg }]}>Remove as manager</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} placeholder="e.g. Rudo Moyo" placeholderTextColor={c.muted} />
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                maxLength={100}
                placeholder="rudo@example.com"
                placeholderTextColor={c.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent }]} onPress={handleInvite} disabled={busy}>
                <Text style={[styles.saveBtnText, { color: c.accentInk }]}>{busy ? 'Sending…' : 'Send invite'}</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>The link works once and expires after 7 days. They'll be able to do everything you can.</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function makeStyles(c) {
  return StyleSheet.create({
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginBottom: 10 },
    inviteBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    inviteBtnText: { fontSize: 16, fontWeight: '700', color: c.text },
    hint: { fontSize: 12, color: c.muted, marginTop: 10 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 20 },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
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
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
    title: { flex: 1, fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    detail: { fontSize: 15, color: c.text },
    detailMuted: { fontSize: 13, color: c.muted, marginTop: 4 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, color: c.text, fontSize: 16 },
    error: { color: c.neg, fontSize: 14, fontWeight: '600', marginTop: 10 },
    saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    saveBtnText: { fontSize: 16, fontWeight: '700' },
    panelActions: { gap: 8, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line },
    panelBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    panelBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
    dangerBtn: { borderColor: `${c.neg}66` },
  });
}
