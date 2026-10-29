import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { getActivity } from '../services/api';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { IconSearch } from '../theme/zbsIcons';
import { niceDate } from '../utils/format';

const GROUPS = [
  ['', 'All'],
  ['items', 'Items & prices'],
  ['staff', 'Staff'],
  ['sheets', 'Sheets'],
  ['exports', 'Exports'],
  ['bar', 'Bar'],
];
const SOURCE = { app: 'App', web: 'Web', admin: 'wp-admin' };

/** Settings › Activity: decisions about the bar's records, newest first. The server writes the log; this only reads it. */
export default function ActivityPanel() {
  const c = useZbsColors();
  const cushion = useBottomCushion(24);
  const isOnline = useNetworkStatus();
  const [group, setGroup] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const latest = useRef(0);
  const styles = makeStyles(c);

  const load = useCallback(async (opts) => {
    const ticket = ++latest.current; // only the newest filter's answer is shown
    setBusy(true);
    setError(null);
    try {
      const d = await getActivity({ group: opts.group || undefined, q: opts.q || undefined, page: opts.page });
      if (ticket !== latest.current) return;
      setRows((prev) => (opts.page > 1 ? [...(prev || []), ...d.rows] : d.rows));
      setMore(!!d.more);
      setPage(opts.page);
    } catch (e) {
      if (ticket !== latest.current) return;
      setError(isOnline ? e.message || 'Could not load the activity log.' : "You're offline. The activity log needs a connection.");
      setRows((prev) => prev ?? []);
    } finally {
      if (ticket === latest.current) setBusy(false);
    }
  }, [isOnline]);

  // Search waits for a pause in typing; a chip applies at once.
  useEffect(() => {
    const t = setTimeout(() => load({ group, q, page: 1 }), q ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, q]);

  const days = [];
  (rows || []).forEach((r) => {
    const last = days[days.length - 1];
    if (last && last.day === r.day) last.rows.push(r);
    else days.push({ day: r.day, rows: [r] });
  });

  return (
    <ScrollView contentContainerStyle={[styles.main, { paddingBottom: cushion }]} keyboardShouldPersistTaps="handled">
      <View style={styles.search}>
        <IconSearch size={18} color={c.muted} />
        <TextInput
          style={styles.searchInput}
          value={q}
          onChangeText={(t) => setQ(t.trim() ? t : '')}
          placeholder="Person, item or detail"
          placeholderTextColor={c.muted}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
        {GROUPS.map(([k, label]) => (
          <TouchableOpacity key={k || 'all'} style={[styles.chip, group === k && { backgroundColor: c.text, borderColor: c.text }]} onPress={() => setGroup(k)}>
            <Text style={[styles.chipText, group === k && { color: c.bg }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!rows ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
      ) : !rows.length ? (
        <Text style={styles.empty}>{group || q ? 'Nothing matches.' : 'Nothing logged yet.'}</Text>
      ) : (
        days.map((d) => (
          <View key={d.day}>
            <Text style={styles.dayH}>{niceDate(d.day, true)}</Text>
            <View style={styles.card}>
              {d.rows.map((r, i) => (
                <View key={r.id} style={[styles.row, i === d.rows.length - 1 && styles.rowLast]}>
                  <Text style={styles.rowTop}>
                    <Text style={styles.label}>{r.label}</Text>
                    {r.subject ? `  ${r.subject}` : ''}
                  </Text>
                  {r.detail ? <Text style={styles.detail}>{r.detail}</Text> : null}
                  <Text style={styles.meta}>
                    {r.who} · {r.time} · {SOURCE[r.source] || r.source}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      {rows && more ? (
        <TouchableOpacity style={styles.moreBtn} onPress={() => load({ group, q, page: page + 1 })} disabled={busy}>
          <Text style={styles.moreText}>{busy ? 'Loading…' : 'Load more'}</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.hint}>
        Items, prices, staff, bar settings, sheets closed or deleted, voided deliveries, deleted notes and exports. Counts on closed sheets have their own
        change history on each sheet.
      </Text>
    </ScrollView>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    main: { padding: 14 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    searchInput: { flex: 1, color: c.text, fontSize: 16, paddingVertical: 0 },
    chipsWrap: { marginTop: 10, marginHorizontal: -14 },
    chips: { gap: 6, paddingHorizontal: 14 },
    chip: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, justifyContent: 'center' },
    chipText: { fontSize: 13, fontWeight: '600', color: c.muted },
    error: { color: c.neg, fontSize: 13, marginTop: 12 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 28 },
    dayH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginTop: 18, marginBottom: 8, marginHorizontal: 2 },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, overflow: 'hidden' },
    row: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    rowLast: { borderBottomWidth: 0 },
    rowTop: { fontSize: 14, color: c.text },
    label: { fontWeight: '700' },
    detail: { fontSize: 13, color: c.text, opacity: 0.85, marginTop: 3 },
    meta: { fontSize: 12, color: c.muted, marginTop: 4 },
    moreBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, marginTop: 14 },
    moreText: { fontSize: 15, fontWeight: '600', color: c.text },
    hint: { fontSize: 12, color: c.muted, marginTop: 14 },
  });
}
