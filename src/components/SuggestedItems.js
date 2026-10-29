import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { getSuggestions, suggestionsDo } from '../services/api';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { IconSearch, IconClose } from '../theme/zbsIcons';
import { titleCase } from '../utils/format';

/**
 * A new bar's first days: the products other bars stock, to pick from instead of typing each one.
 * The server decides whether they are offered (the bar's first 7 days) and keeps what was picked,
 * dismissed or hidden, so this card and its picker only show and ask.
 */
export default function SuggestedItems({ onAdded }) {
  const c = useZbsColors();
  const [s, setS] = useState(null);
  const [open, setOpen] = useState(false);
  const styles = makeStyles(c);

  const load = useCallback(async () => {
    try {
      setS(await getSuggestions());
    } catch {
      setS(null); // not offered, or offline: nothing to show
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(what, body) {
    const next = await suggestionsDo(what, body);
    setS(next);
    if (next.added) onAdded?.();
    return next;
  }

  if (!s || !s.open) return null;
  const waiting = s.items.filter((i) => !i.dismissed).length;
  const days = `${s.days_left} more day${s.days_left === 1 ? '' : 's'}`;

  return (
    <>
      {s.hidden ? (
        <TouchableOpacity style={styles.slim} onPress={() => setOpen(true)}>
          <Text style={styles.slimText}>Suggested items · {waiting} to pick from</Text>
          <Text style={styles.slimMeta}>{days}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start faster</Text>
          <Text style={styles.cardText}>
            Pick from {waiting} products other bars stock, instead of typing each one. Prices stay yours to set. Offered for {days}.
          </Text>
          <View style={styles.cardRow}>
            <TouchableOpacity style={[styles.cardBtn, { backgroundColor: c.accent }]} onPress={() => setOpen(true)}>
              <Text style={[styles.cardBtnText, { color: c.accentInk }]}>Choose items</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cardGhost} onPress={() => act('hide').catch(() => {})}>
              <Text style={styles.cardGhostText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Picker visible={open} s={s} days={days} onClose={() => setOpen(false)} act={act} />
    </>
  );
}

function Picker({ visible, s, days, onClose, act }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(16);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState({});
  const [showDismissed, setShowDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const styles = makeStyles(c);

  useEffect(() => {
    if (visible) {
      setPicked({});
      setQ('');
      setError(null);
    }
  }, [visible]);

  const qq = q.trim().toLowerCase();
  const match = (i) => !qq || `${i.name} ${i.group}`.toLowerCase().includes(qq);
  const groups = useMemo(() => {
    const m = new Map();
    s.items.filter((i) => !i.dismissed && match(i)).forEach((i) => {
      if (!m.has(i.group)) m.set(i.group, []);
      m.get(i.group).push(i);
    });
    return Array.from(m.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, qq]);
  const dismissed = s.items.filter((i) => i.dismissed && match(i));
  const keys = Object.keys(picked).filter((k) => picked[k]);

  function toggleGroup(rows) {
    const all = rows.every((r) => picked[r.key]);
    setPicked((p) => {
      const n = { ...p };
      rows.forEach((r) => (n[r.key] = !all));
      return n;
    });
  }

  async function run(what, body) {
    setBusy(true);
    setError(null);
    try {
      await act(what, body);
      setPicked({});
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: cushion }]}>
          <View style={styles.head}>
            <View style={styles.flex1}>
              <Text style={styles.title}>Suggested items</Text>
              <Text style={styles.sub}>Offered for {days}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.search}>
            <IconSearch size={18} color={c.muted} />
            <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Search products" placeholderTextColor={c.muted} />
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {!groups.length && !dismissed.length ? <Text style={styles.empty}>{qq ? 'Nothing matches.' : 'All picked or dismissed.'}</Text> : null}
            {groups.map(([g, rows]) => (
              <View key={g}>
                <View style={styles.groupRow}>
                  <Text style={styles.groupH}>{titleCase(g)}</Text>
                  <TouchableOpacity onPress={() => toggleGroup(rows)} hitSlop={8}>
                    <Text style={styles.groupAll}>{rows.every((r) => picked[r.key]) ? 'Clear' : 'Select all'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.box}>
                  {rows.map((r, i) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.row, i === rows.length - 1 && styles.lastRow]}
                      onPress={() => setPicked((p) => ({ ...p, [r.key]: !p[r.key] }))}
                    >
                      <View style={[styles.tick, picked[r.key] && { backgroundColor: c.accent, borderColor: c.accent }]}>
                        {picked[r.key] ? <Text style={[styles.tickMark, { color: c.accentInk }]}>✓</Text> : null}
                      </View>
                      <Text style={styles.rowText} numberOfLines={1}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {s.items.some((i) => i.dismissed) ? (
              <TouchableOpacity onPress={() => setShowDismissed(!showDismissed)} style={styles.dismissedToggle}>
                <Text style={styles.groupH}>
                  Dismissed · {s.items.filter((i) => i.dismissed).length} {showDismissed ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
            ) : null}
            {showDismissed && dismissed.length ? (
              <View style={styles.box}>
                {dismissed.map((r, i) => (
                  <View key={r.key} style={[styles.row, i === dismissed.length - 1 && styles.lastRow]}>
                    <Text style={[styles.rowText, styles.muted]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <TouchableOpacity onPress={() => run('restore', { keys: [r.key] })} disabled={busy} hitSlop={8}>
                      <Text style={styles.groupAll}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.bar}>
            <TouchableOpacity
              style={[styles.barGhost, !keys.length && styles.disabled]}
              disabled={!keys.length || busy}
              onPress={() => run('dismiss', { keys })}
            >
              <Text style={styles.barGhostText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.barBtn, { backgroundColor: c.accent }, !keys.length && styles.disabled]}
              disabled={!keys.length || busy}
              onPress={() => run('add', { keys })}
            >
              {busy ? <ActivityIndicator color={c.accentInk} /> : <Text style={[styles.barBtnText, { color: c.accentInk }]}>{keys.length ? `Add ${keys.length} item${keys.length === 1 ? '' : 's'}` : 'Pick items to add'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex1: { flex: 1 },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.accent, borderRadius: 16, padding: 14, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 4 },
    cardText: { fontSize: 13, color: c.muted, lineHeight: 19 },
    cardRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    cardBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardBtnText: { fontSize: 15, fontWeight: '700' },
    cardGhost: { height: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardGhostText: { fontSize: 15, fontWeight: '600', color: c.text },
    slim: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, marginBottom: 12 },
    slimText: { fontSize: 14, fontWeight: '600', color: c.text },
    slimMeta: { fontSize: 12, color: c.muted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, height: '90%' },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    title: { fontSize: 17, fontWeight: '700', color: c.text },
    sub: { fontSize: 12, color: c.muted, marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    searchInput: { flex: 1, color: c.text, fontSize: 16, paddingVertical: 0 },
    list: { flex: 1, marginTop: 4 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 24 },
    groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, marginHorizontal: 2 },
    groupH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted },
    groupAll: { fontSize: 13, fontWeight: '600', color: c.accent },
    box: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    lastRow: { borderBottomWidth: 0 },
    tick: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.muted, alignItems: 'center', justifyContent: 'center' },
    tickMark: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
    rowText: { flex: 1, fontSize: 15, color: c.text },
    muted: { color: c.muted },
    dismissedToggle: { marginTop: 18, marginBottom: 8, marginHorizontal: 2 },
    error: { color: c.neg, fontSize: 13, marginTop: 8 },
    bar: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line, marginTop: 8 },
    barGhost: { height: 50, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    barGhostText: { fontSize: 15, fontWeight: '600', color: c.text },
    barBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    barBtnText: { fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.5 },
  });
}
