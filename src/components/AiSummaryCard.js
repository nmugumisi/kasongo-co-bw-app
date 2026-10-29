import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getSheetSummary, makeSheetSummary } from '../services/api';
import { useZbsColors } from '../theme/zbsColors';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { IconAi, IconRefresh, IconNext } from '../theme/zbsIcons';
import AiText from './AiText';

/**
 * Shift brief for managers on the Review screen. Shows the cached brief straight away (that costs nothing);
 * writing a new one is a tap, and the server hands back the cached one if the sheet hasn't changed.
 * `version` changes whenever the sheet's figures do, so a stale brief is re-checked.
 */
export default function AiSummaryCard({ sheetId, date, version }) {
  const navigation = useNavigation();
  const c = useZbsColors();
  const isOnline = useNetworkStatus();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState(null);
  const styles = makeStyles(c);

  useEffect(() => {
    if (!isOnline) return;
    let live = true;
    getSheetSummary(sheetId)
      .then((d) => {
        if (!live) return;
        setSummary(d.summary);
        setStatus(d.status);
      })
      .catch(() => {})
      .finally(() => live && setChecked(true));
    return () => {
      live = false;
    };
  }, [sheetId, version, isOnline]);

  async function write(force) {
    setBusy(true);
    setNotice(null);
    try {
      const d = await makeSheetSummary(sheetId, { force });
      setSummary(d.summary);
      setStatus(d.status);
      if (d.notice) setNotice(d.notice);
    } catch (e) {
      setNotice(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Not set up on this site: stay out of the way rather than show a button that can't work.
  if (checked && status && !status.enabled && !summary) return null;
  if (!isOnline && !summary) return null;

  const blocked = status && (status.budget_reached || status.daily_remaining < 1);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <IconAi size={16} color={c.accent} />
        <Text style={styles.title}>Shift brief</Text>
        {summary && !busy ? (
          <TouchableOpacity
            style={styles.refresh}
            onPress={() => write(!summary.stale)}
            disabled={!isOnline || blocked}
            hitSlop={8}
            accessibilityLabel="Write the brief again"
          >
            <IconRefresh size={15} color={c.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {busy ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={styles.muted}>Reading the sheet…</Text>
        </View>
      ) : summary ? (
        <>
          {summary.stale ? (
            <TouchableOpacity style={styles.stale} onPress={() => write(false)} disabled={!isOnline || blocked}>
              <Text style={styles.staleText}>The sheet changed since this brief. Tap to update.</Text>
            </TouchableOpacity>
          ) : null}
          <AiText text={summary.text} />
          <Text style={styles.meta}>
            {summary.source === 'ai' ? `AI · ${summary.model}` : 'Plain summary'} · {summary.at}
            {summary.by ? ` · ${summary.by}` : ''}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.muted}>Biggest shortages, repeat problems, missing deliveries and notes worth a look, in a few lines.</Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.accent }, (!checked || blocked) && styles.disabled]}
            onPress={() => write(false)}
            disabled={!checked || blocked}
          >
            <Text style={[styles.btnText, { color: c.accentInk }]}>Write shift brief</Text>
          </TouchableOpacity>
        </>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {blocked && !busy ? (
        <Text style={styles.notice}>
          {status.budget_reached ? "This month's AI limit has been reached." : "You've used today's AI limit. It resets at midnight."}
        </Text>
      ) : null}

      <TouchableOpacity style={styles.ask} onPress={() => navigation.navigate('Ask', { sheetId, date })}>
        <Text style={styles.askText}>Ask about this sheet</Text>
        <IconNext size={16} color={c.muted} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, marginTop: 14 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    title: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted },
    refresh: { padding: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    muted: { fontSize: 13, color: c.muted, lineHeight: 19 },
    meta: { fontSize: 11, color: c.muted, marginTop: 4 },
    stale: { backgroundColor: c.warnBg, borderRadius: 10, padding: 8, marginBottom: 8 },
    staleText: { fontSize: 12, color: c.warn },
    btn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    btnText: { fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    notice: { fontSize: 12, color: c.warn, marginTop: 8 },
    ask: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, marginTop: 12, paddingTop: 10 },
    askText: { fontSize: 14, fontWeight: '600', color: c.text },
  });
}
