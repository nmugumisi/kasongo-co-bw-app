import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getBar } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { IconNext } from '../theme/zbsIcons';

/**
 * Home for a bar waiting for approval (or declined): what can be set up now, and where.
 * The server refuses sheets, passcodes, AI and downloads until approval; this explains it.
 * Checks again each time Home comes into view, so approval shows up without signing out.
 */
export default function PendingHome({ status, bottom }) {
  const navigation = useNavigation();
  const c = useZbsColors();
  const { settings, refreshSettings } = useAuth();
  const [bar, setBar] = useState(null);
  const styles = makeStyles(c);

  useFocusEffect(
    useCallback(() => {
      getBar()
        .then((b) => {
          setBar(b);
          if (b.status !== status) refreshSettings(); // approved (or declined) since: Home re-renders from settings
        })
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status])
  );

  const st = bar?.setup;
  const steps = [
    { done: st?.items > 0, label: 'Add your stock items', sub: st ? (st.items ? `${st.items} item${st.items === 1 ? '' : 's'} so far` : 'Pick from suggestions or add your own') : '…', tab: 'items' },
    ...(settings.show_values ? [{ done: st?.items > 0 && st.priced >= st.items, label: 'Set prices', sub: st ? `${st.priced} of ${st.items} priced` : '…', tab: 'items' }] : []),
    { done: st?.cashiers > 0, label: 'Add cashiers', sub: st ? (st.cashiers ? `${st.cashiers} added` : 'Each gets a 4-digit passcode') : '…', tab: 'cashiers' },
    { done: st?.managers > 1, label: 'Invite a manager', sub: st ? (st.managers > 1 ? `${st.managers - 1} invited` : 'Optional: someone to share the work') : '…', tab: 'cashiers' },
    { done: false, label: 'Bar profile', sub: 'Name, money values and currency', tab: 'bar' },
  ];

  return (
    <ScrollView contentContainerStyle={[styles.main, { paddingBottom: bottom }]}>
      {status === 'declined' ? (
        <View style={[styles.card, { borderColor: c.neg }]}>
          <Text style={[styles.eyebrow, { color: c.neg }]}>Not approved</Text>
          <Text style={styles.cardTitle}>We couldn't approve this bar</Text>
          {bar?.note ? <Text style={[styles.note, { backgroundColor: c.negBg }]}>{bar.note}</Text> : null}
          <Text style={styles.muted}>
            {bar?.deletes ? `It will be deleted on ${bar.deletes}. ` : ''}Reply to the email we sent if you'd like to talk about it.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.card, { borderColor: c.accent }]}>
            <Text style={[styles.eyebrow, { color: c.accent }]}>Waiting for approval</Text>
            <Text style={styles.cardTitle}>Set up while we check your bar</Text>
            <Text style={styles.muted}>
              Usually within a day. Stock sheets, cashier passcodes, the AI assistant and downloads open once it's approved. Everything you set up now is kept.
            </Text>
          </View>
          <Text style={styles.sectionH}>Get ready</Text>
          <View style={styles.list}>
            {steps.map((s) => (
              <TouchableOpacity key={s.label} style={styles.row} onPress={() => navigation.navigate('Settings', { tab: s.tab })}>
                <View style={[styles.tick, s.done && { backgroundColor: c.pos, borderColor: c.pos }]}>
                  {s.done ? <Text style={styles.tickMark}>✓</Text> : null}
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.rowTitle}>{s.label}</Text>
                  <Text style={styles.rowSub}>{s.sub}</Text>
                </View>
                <IconNext size={18} color={c.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    main: { padding: 14 },
    card: { backgroundColor: c.card, borderWidth: 1, borderRadius: 16, padding: 16 },
    eyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 6 },
    muted: { fontSize: 13, color: c.muted, lineHeight: 19 },
    note: { fontSize: 14, color: c.text, borderRadius: 10, padding: 10, marginVertical: 8, overflow: 'hidden' },
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginTop: 22, marginBottom: 10, marginHorizontal: 2 },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
    tickMark: { color: '#fff', fontSize: 14, fontWeight: '800' },
    flex1: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    rowSub: { fontSize: 13, color: c.muted, marginTop: 2 },
  });
}
