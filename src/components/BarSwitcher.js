import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { IconClose, IconCheck } from '../theme/zbsIcons';

const ROLE = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };
const STATUS = { pending: 'Waiting for approval', declined: 'Not approved' };

/** The list behind the bar name on Home, for someone who works at more than one bar. */
export default function BarSwitcher({ visible, onClose }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(24);
  const isOnline = useNetworkStatus();
  const { bars, barId, switchBar } = useAuth();
  const [busy, setBusy] = useState(0);
  const styles = makeStyles(c);

  if (!visible) return null;

  async function pick(id) {
    if (id === barId) return onClose();
    if (!isOnline) {
      Alert.alert("You're offline", 'Connect to the internet to switch bars.');
      return;
    }
    setBusy(id);
    try {
      await switchBar(id); // the screens start again from Home in the new bar
    } catch (e) {
      setBusy(0);
      Alert.alert('Could not switch', e.message || 'Something went wrong.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={busy ? undefined : onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <View style={styles.flex1}>
              <Text style={styles.title}>Switch bar</Text>
              <Text style={styles.sub}>You work at {bars.length} bars</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={!!busy}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.list}>
            {bars.map((b) => {
              const on = b.id === barId;
              return (
                <TouchableOpacity key={b.id} style={[styles.row, on && { borderColor: c.accent }]} onPress={() => pick(b.id)} disabled={!!busy}>
                  <View style={[styles.avatar, { backgroundColor: `${c.accent}38` }]}>
                    <Text style={styles.avatarText}>{(b.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {ROLE[b.role] || ''}
                      {on ? ' · open now' : ''}
                    </Text>
                  </View>
                  {STATUS[b.status] ? (
                    <View style={[styles.pill, { backgroundColor: c.warnBg }]}>
                      <Text style={[styles.pillText, { color: c.warn }]}>{STATUS[b.status]}</Text>
                    </View>
                  ) : null}
                  {busy === b.id ? <ActivityIndicator color={c.accent} /> : on ? <IconCheck size={20} color={c.accent} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 28 },
    grab: { width: 42, height: 5, borderRadius: 5, backgroundColor: c.card2, alignSelf: 'center', marginBottom: 8 },
    head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    title: { fontSize: 17, fontWeight: '700', color: c.text },
    sub: { fontSize: 13, color: c.muted, marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontWeight: '800', fontSize: 15, color: c.text },
    flex1: { flex: 1, minWidth: 0 },
    rowName: { fontSize: 15, fontWeight: '700', color: c.text },
    rowMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
    pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    pillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  });
}
