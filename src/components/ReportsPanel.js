import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getReport, shareReportExport } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { fmt, signed, money, units, titleCase } from '../utils/format';
import { IconXls, IconPdf } from '../theme/zbsIcons';

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Same presets and maths as range() in zbs-app.js.
function range(kind) {
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  let a;
  let b = new Date(t);
  if (kind === 'today') a = new Date(t);
  else if (kind === 'week') {
    a = new Date(t);
    a.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  } else if (kind === 'last') {
    a = new Date(t.getFullYear(), t.getMonth() - 1, 1, 12);
    b = new Date(t.getFullYear(), t.getMonth(), 0, 12);
  } else a = new Date(t.getFullYear(), t.getMonth(), 1, 12);
  return [iso(a), iso(b)];
}

const PRESETS = [
  ['today', 'Today'],
  ['week', 'This week'],
  ['month', 'This month'],
  ['last', 'Last month'],
];

export default function ReportsPanel() {
  const c = useZbsColors();
  const cushion = useBottomCushion(32);
  const { settings, readOnly } = useAuth();
  const V = settings.show_values;
  const [[from, to], setRange] = useState(() => range('month'));
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [onlyVar, setOnlyVar] = useState(true);
  const [picking, setPicking] = useState(null); // 'from' | 'to' | null
  const [downloading, setDownloading] = useState(null); // 'xlsx' | 'pdf' | null
  const [dlError, setDlError] = useState(null);
  const styles = makeStyles(c);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(null);
    getReport({ from, to })
      .then((r) => !cancelled && setReport(r))
      .catch((e) => !cancelled && setError(e.message || 'Something went wrong.'));
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const rows = useMemo(() => {
    if (!report) return [];
    const list = report.rows.filter((x) => !onlyVar || x.variance !== 0);
    if (onlyVar) list.sort((a, b) => (V ? a.value - b.value : 0) || a.variance - b.variance);
    return list;
  }, [report, onlyVar, V]);

  function onPick(ev, picked) {
    const which = picking;
    setPicking(Platform.OS === 'ios' ? which : null);
    if (!picked) return;
    const val = iso(picked);
    let f = which === 'from' ? val : from;
    let t = which === 'to' ? val : to;
    if (f > t) [f, t] = [t, f];
    setRange([f, t]);
  }

  async function download(format) {
    setDownloading(format);
    setDlError(null);
    try {
      await shareReportExport({ from, to, only: onlyVar, format });
    } catch (e) {
      setDlError(e.message || 'Something went wrong.');
    } finally {
      setDownloading(null);
    }
  }

  const t = report?.totals;

  return (
    <ScrollView contentContainerStyle={[styles.main, { paddingBottom: cushion }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PRESETS.map(([k, label]) => {
          const [a, b] = range(k);
          const on = from === a && to === b;
          return (
            <TouchableOpacity key={k} style={[styles.chip, on && { backgroundColor: c.text, borderColor: c.text }]} onPress={() => setRange([a, b])}>
              <Text style={[styles.chipText, { color: on ? c.bg : c.muted }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.dates}>
        {[
          ['from', 'From', from],
          ['to', 'To', to],
        ].map(([key, label, val]) => (
          <View key={key} style={styles.flex1}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setPicking(key)}>
              <Text style={styles.dateText}>{val}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      {picking ? (
        <DateTimePicker
          value={new Date((picking === 'from' ? from : to) + 'T12:00:00')}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onPick}
        />
      ) : null}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !report ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.kpis}>
            <Kpi styles={styles} label="Units sold" value={fmt(t.sales)} />
            {V ? (
              <>
                <Kpi styles={styles} label="Net variance value" value={money(t.value, settings.currency)} color={t.value < 0 ? c.neg : t.value > 0 ? c.pos : null} />
                <Kpi styles={styles} label="Shortages" value={money(t.short, settings.currency)} color={t.short < 0 ? c.neg : null} />
                <Kpi styles={styles} label="Overs" value={money(t.over, settings.currency)} color={t.over > 0 ? c.pos : null} />
              </>
            ) : (
              <>
                <Kpi styles={styles} label="Net variance" value={signed(t.variance)} color={t.variance < 0 ? c.neg : t.variance > 0 ? c.pos : null} />
                <Kpi styles={styles} label="Units short" value={units(t.short_qty)} color={t.short_qty < 0 ? c.neg : null} />
                <Kpi styles={styles} label="Units over" value={units(t.over_qty)} color={t.over_qty > 0 ? c.pos : null} />
              </>
            )}
          </View>

          <Text style={styles.hint}>
            {report.sheets} closed sheet{report.sheets === 1 ? '' : 's'}
            {report.drafts ? ` · ${report.drafts} still open (not included)` : ''}
          </Text>

          <View style={styles.switchRow}>
            <Switch value={onlyVar} onValueChange={setOnlyVar} trackColor={{ true: c.accent, false: c.card2 }} thumbColor={c.muted} />
            <Text style={styles.switchLabel}>Only items with a variance</Text>
          </View>

          {!rows.length ? (
            <Text style={styles.empty}>{report.sheets ? 'No variances in this period. Clean counts.' : 'No closed sheets in this period.'}</Text>
          ) : (
            <View style={styles.mini}>
              {rows.map((x, i) => (
                <View key={x.id} style={[styles.repRow, i === rows.length - 1 && styles.lastRow]}>
                  <View style={styles.flex1}>
                    <Text style={styles.repName}>{x.name}</Text>
                    <Text style={styles.repMeta}>
                      {titleCase(x.group)} · sold {fmt(x.sales)}
                      {x.short_days ? ` · short ${x.short_days} day${x.short_days === 1 ? '' : 's'}` : ''}
                    </Text>
                  </View>
                  <View style={styles.repNum}>
                    <Text style={[styles.repVar, x.variance < 0 ? { color: c.neg } : x.variance > 0 ? { color: c.pos } : null]}>{signed(x.variance)}</Text>
                    {V && x.value ? <Text style={styles.repMeta}>{money(x.value, settings.currency)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {readOnly ? null : (
          <View style={styles.dl}>
            {[
              ['xlsx', 'Excel', IconXls],
              ['pdf', 'PDF', IconPdf],
            ].map(([fmtKey, label, Icon]) => (
              <TouchableOpacity key={fmtKey} style={styles.dlBtn} onPress={() => download(fmtKey)} disabled={!!downloading}>
                {downloading === fmtKey ? <ActivityIndicator color={c.text} /> : <Icon size={18} color={c.text} />}
                <Text style={styles.dlText}>{downloading === fmtKey ? 'Preparing…' : label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          )}
          {dlError ? <Text style={styles.error}>{dlError}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

function Kpi({ styles, label, value, color }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLbl}>{label}</Text>
      <Text style={[styles.kpiVal, color && { color }]}>{value}</Text>
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    main: { padding: 14, paddingTop: 4, paddingBottom: 32 },
    flex1: { flex: 1 },
    chips: { gap: 6, paddingBottom: 12 },
    chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 14, fontWeight: '600' },
    dates: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: c.muted, marginBottom: 6 },
    dateInput: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, justifyContent: 'center', paddingHorizontal: 12 },
    dateText: { fontSize: 16, color: c.text },
    error: { color: c.neg, textAlign: 'center', marginTop: 20 },
    kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpi: { width: '48%', flexGrow: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, gap: 4 },
    kpiLbl: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted },
    kpiVal: { fontSize: 24, fontWeight: '700', color: c.text },
    hint: { fontSize: 12, color: c.muted, textAlign: 'center', marginTop: 10 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 10 },
    switchLabel: { fontSize: 14, fontWeight: '600', color: c.text },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 24 },
    mini: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, overflow: 'hidden' },
    repRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    lastRow: { borderBottomWidth: 0 },
    repName: { fontSize: 15, fontWeight: '700', color: c.text },
    repMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
    repNum: { alignItems: 'flex-end' },
    repVar: { fontSize: 17, fontWeight: '700', color: c.text },
    dl: { flexDirection: 'row', gap: 8, marginTop: 14 },
    dlBtn: { flex: 1, flexDirection: 'row', gap: 8, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    dlText: { fontSize: 16, fontWeight: '700', color: c.text },
  });
}
