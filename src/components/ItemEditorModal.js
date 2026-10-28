import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { IconPrev, IconNext, IconClose } from '../theme/zbsIcons';
import { calc } from '../utils/calc';
import { fmt, signed, titleCase, niceDate, hhmm } from '../utils/format';
import ZbsKeypad from './ZbsKeypad';

const FIELDS = ['open', 'add', 'pos', 'count'];
const LABEL = { open: 'Open', add: '+ Add', pos: 'Sold', count: 'Count' };

function parseNum(s) {
  if (s === '' || s === null || s === undefined) return 0;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

function startFieldFor(mode, isClosed) {
  if (isClosed) return 'count';
  if (mode === 'sales') return 'pos';
  if (mode === 'deliveries') return 'add';
  return 'count';
}

export default function ItemEditorModal({
  visible,
  items,
  startIndex,
  mode,
  isClosed,
  prevSheet,
  onClose,
  onChangeField,
  onLogReceipt,
  onVoidReceipt,
}) {
  const c = useZbsColors();
  const cushion = useBottomCushion(20);
  const [idx, setIdx] = useState(0);
  const [field, setField] = useState('count');
  const [buf, setBuf] = useState('');
  const [fresh, setFresh] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIdx(Math.max(0, startIndex));
    setField(startFieldFor(mode, isClosed));
    setBuf('');
    setFresh(true);
    setNote('');
  }, [visible, startIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const it = items[idx];
  if (!visible || !it) return null;

  const cc = calc(it);
  const isAdd = field === 'add';
  const ro = field === 'open';

  function closeAndReset() {
    onClose();
  }

  function moveItem(dir, fromNext) {
    const n = idx + dir;
    if (n < 0) return;
    if (n >= items.length) {
      closeAndReset();
      return;
    }
    setIdx(n);
    setFresh(true);
    setBuf('');
    setNote('');
    if (mode === 'deliveries') setField(startFieldFor(mode, isClosed));
  }

  async function logReceipt() {
    const qty = Math.round(parseNum(buf) * 100) / 100;
    if (qty <= 0) return;
    setBusy(true);
    try {
      await onLogReceipt(it.id, qty, note.trim());
      setBuf('');
      setNote('');
    } finally {
      setBusy(false);
    }
  }

  function press(key) {
    if (isAdd) {
      if (key === 'next') {
        if (parseNum(buf) > 0) logReceipt();
        else moveItem(1, true);
        return;
      }
      let b = buf;
      if (key === 'plus' || key === 'minus') b = fmt(Math.max(0, Math.round((parseNum(b) + (key === 'plus' ? 1 : -1)) * 100) / 100));
      else if (key === 'clear') b = '';
      else if (key === 'back') b = b.slice(0, -1);
      else {
        if (key === '.' && b.indexOf('.') !== -1) return;
        if (b.length >= 7) return;
        b = b === '0' && key !== '.' ? key : b + key;
        if (b === '.') b = '0.';
      }
      setBuf(b === '0' ? '' : b);
      return;
    }

    if (key === 'next') {
      moveItem(1, true);
      return;
    }
    if (ro) return;

    const cur = field === 'count' ? it.count : it[field];
    if (key === 'plus' || key === 'minus') {
      const base = cur === null || cur === undefined ? 0 : cur;
      const nv = Math.max(0, Math.round((base + (key === 'plus' ? 1 : -1)) * 100) / 100);
      onChangeField(it.id, field, nv);
      setBuf(fmt(nv));
      setFresh(true);
    } else if (key === 'clear') {
      onChangeField(it.id, field, field === 'count' ? null : 0);
      setBuf('');
      setFresh(false);
    } else if (key === 'back') {
      let b = fresh ? (cur === null || cur === undefined ? '' : fmt(cur)) : buf;
      b = b.slice(0, -1);
      setBuf(b);
      setFresh(false);
      onChangeField(it.id, field, b === '' ? (field === 'count' ? null : 0) : Math.max(0, parseNum(b)));
    } else {
      let s = fresh ? '' : buf;
      if (key === '.' && s.indexOf('.') !== -1) return;
      if (s.length >= 7) return;
      s = s === '0' && key !== '.' ? key : s + key;
      if (s === '.') s = '0.';
      setBuf(s);
      setFresh(false);
      onChangeField(it.id, field, Math.max(0, parseNum(s)));
    }
  }

  async function handleVoid(rid, clientId) {
    setBusy(true);
    try {
      await onVoidReceipt(it.id, rid, clientId);
    } finally {
      setBusy(false);
    }
  }

  const displayVal = isAdd ? buf : fresh ? (field === 'count' && it.count === null ? '' : fmt(it[field])) : buf;
  const clearDisabled = isClosed && field === 'count';
  const nextLabel = isAdd && parseNum(buf) > 0 ? `Log +${fmt(parseNum(buf))}` : idx >= items.length - 1 ? 'Done' : 'Next';
  const styles = makeStyles(c);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAndReset}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeAndReset}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <TouchableOpacity style={styles.headIcon} disabled={idx === 0} onPress={() => moveItem(-1)}>
              <IconPrev size={18} color={idx === 0 ? c.card2 : c.text} />
            </TouchableOpacity>
            <View style={styles.headTitle}>
              <Text style={styles.headSmall} numberOfLines={1}>
                {titleCase(it.group)} · {idx + 1}/{items.length}
                {it.by ? ` · ${it.by_me ? 'you' : it.by}${it.at ? ` ${it.at}` : ''}` : ''}
              </Text>
              <Text style={styles.headStrong} numberOfLines={1}>
                {it.name}
              </Text>
            </View>
            <TouchableOpacity style={styles.headIcon} disabled={idx >= items.length - 1} onPress={() => moveItem(1)}>
              <IconNext size={18} color={idx >= items.length - 1 ? c.card2 : c.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headIcon} onPress={closeAndReset}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.stats}>
              {[
                ['Open', fmt(it.open), null],
                ['In', fmt(cc.received), null],
                ['Sold', fmt(it.pos), cc.oversold ? 'warn' : null],
                ['Expected', fmt(cc.expected), null],
                ['Variance', cc.counted ? signed(cc.variance) : '-', cc.counted ? (cc.variance < 0 ? 'neg' : cc.variance > 0 ? 'pos' : 'ok') : null],
              ].map(([lbl, val, kind]) => (
                <View
                  key={lbl}
                  style={[
                    styles.stat,
                    kind === 'neg' && { backgroundColor: c.negBg },
                    (kind === 'pos' || kind === 'ok') && { backgroundColor: c.posBg },
                    kind === 'warn' && { backgroundColor: c.warnBg },
                  ]}
                >
                  <Text style={styles.statLbl}>{lbl}</Text>
                  <Text
                    style={[
                      styles.statVal,
                      kind === 'neg' && { color: c.neg },
                      (kind === 'pos' || kind === 'ok') && { color: c.pos },
                      kind === 'warn' && { color: c.warn },
                    ]}
                  >
                    {val}
                  </Text>
                </View>
              ))}
            </View>

            {cc.oversold ? (
              <View style={[styles.warnBanner, { backgroundColor: c.warnBg }]}>
                <Text style={{ color: c.warn, fontSize: 12 }}>Sold is more than Open + In. Check the POS figure or a missing delivery.</Text>
              </View>
            ) : null}

            <View style={styles.tabs}>
              {FIELDS.map((f) => {
                const v = f === 'count' ? (it.count === null ? '-' : fmt(it.count)) : f === 'add' ? fmt(cc.received) : fmt(it[f]);
                const on = field === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.tab, on && { backgroundColor: c.accent }]}
                    onPress={() => {
                      setField(f);
                      setFresh(true);
                      setBuf('');
                    }}
                  >
                    <Text style={[styles.tabLbl, { color: on ? c.accentInk : c.muted }]}>{LABEL[f]}</Text>
                    <Text style={[styles.tabVal, { color: on ? c.accentInk : c.text }]}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.display, { borderColor: c.accent }, isAdd && { }]}>
              <Text style={styles.displaySmall}>
                {isAdd
                  ? `New delivery · ${hhmm()}`
                  : LABEL[field] + (field === 'open' ? (prevSheet ? ` · closing of ${niceDate(prevSheet.date)}` : ' · first sheet, add stock with + Add') : '')}
              </Text>
              <Text style={[styles.displayVal, { color: isAdd ? c.pos : c.text }, fresh && !isAdd && { opacity: 0.55 }]}>
                {displayVal === '' ? (
                  <Text style={styles.displayPlaceholder}>{isAdd ? 'qty received' : 'tap to enter'}</Text>
                ) : (
                  (isAdd ? '+' : '') + displayVal
                )}
              </Text>
            </View>

            {isAdd ? (
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                maxLength={120}
                placeholder={!prevSheet && !it.received ? 'Note, e.g. Opening stock' : 'Note: supplier, invoice no. (optional)'}
                placeholderTextColor={c.muted}
              />
            ) : null}

            <ZbsKeypad
              onKey={press}
              disabled={busy || (!isAdd && ro)}
              clearDisabled={clearDisabled}
              nextLabel={nextLabel}
              isLog={isAdd && parseNum(buf) > 0}
            />

            {isAdd ? (
              <View style={styles.hist}>
                <View style={styles.histHead}>
                  <Text style={styles.histHeadLbl}>Deliveries today</Text>
                  <Text style={[styles.histHeadVal, { color: c.pos }]}>{fmt(cc.received)} in</Text>
                </View>
                {!it.receipts?.length ? (
                  <Text style={styles.histEmpty}>Nothing logged yet.</Text>
                ) : (
                  it.receipts
                    .slice()
                    .reverse()
                    .map((r, i) => (
                      <View key={r.id || r.client_id || i} style={styles.histRow}>
                        <Text style={[styles.histTime, r.voided && styles.strike]}>{r.time}</Text>
                        <Text style={[styles.histQty, { color: c.pos }, r.voided && styles.strike]}>+{fmt(r.qty)}</Text>
                        <Text style={styles.histMeta} numberOfLines={1}>
                          <Text style={{ color: c.text, fontWeight: '600' }}>{r.by}</Text>
                          {r.note ? ` · ${r.note}` : ''}
                          {r.voided ? ` · voided${r.voided_by ? ` by ${r.voided_by}` : ''}` : ''}
                        </Text>
                        {!r.voided && r.can_void ? (
                          <TouchableOpacity style={styles.voidBtn} onPress={() => handleVoid(r.id, r.client_id)} disabled={busy}>
                            <IconClose size={14} color={c.muted} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))
                )}
              </View>
            ) : null}

            {it.changes?.length ? (
              <View style={styles.hist}>
                <View style={styles.histHead}>
                  <Text style={styles.histHeadLbl}>Change history</Text>
                  <Text style={styles.histHeadVal}>{it.changes.length}</Text>
                </View>
                {it.changes.map((ch) => (
                  <View key={ch.id} style={styles.changeRow}>
                    <Text style={styles.changeTop}>
                      {ch.label} <Text style={styles.changeWas}>{ch.old === null ? '–' : fmt(ch.old)}</Text> {'→'}{' '}
                      <Text style={{ fontWeight: '700', color: c.text }}>{ch['new'] === null ? '–' : fmt(ch['new'])}</Text>
                    </Text>
                    <Text style={styles.changeMeta}>
                      {ch.time} · {ch.by || '-'} · {ch.source}
                    </Text>
                  </View>
                ))}
              </View>
            ) : isClosed ? (
              <Text style={styles.histHint}>Closed sheet · changes to this item will be recorded.</Text>
            ) : null}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bg2, maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 24 },
    grab: { width: 42, height: 5, borderRadius: 5, backgroundColor: c.card2, alignSelf: 'center', marginBottom: 8 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    headTitle: { flex: 1, alignItems: 'center' },
    headSmall: { fontSize: 12, color: c.muted },
    headStrong: { fontSize: 17, fontWeight: '700', color: c.text },
    stats: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 8 },
    stat: { flex: 1, backgroundColor: c.card, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: c.line, gap: 2 },
    statLbl: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted },
    statVal: { fontSize: 15, fontWeight: '700', color: c.text },
    warnBanner: { borderRadius: 10, padding: 10, marginBottom: 8 },
    tabs: { flexDirection: 'row', gap: 4, backgroundColor: c.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.line },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
    tabLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
    tabVal: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    display: {
      marginTop: 10,
      marginBottom: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: c.card,
      borderWidth: 2,
      alignItems: 'flex-end',
    },
    displaySmall: { alignSelf: 'flex-start', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted, fontWeight: '700' },
    displayVal: { fontSize: 42, fontWeight: '750', letterSpacing: -1 },
    displayPlaceholder: { fontSize: 18, fontWeight: '500', color: c.muted },
    noteInput: {
      height: 42,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.card,
      color: c.text,
      fontSize: 15,
    },
    hist: { marginTop: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' },
    histHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    histHeadLbl: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted, fontWeight: '700' },
    histHeadVal: { fontSize: 13, fontWeight: '700', color: c.text },
    histEmpty: { padding: 12, color: c.muted, fontSize: 13 },
    histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    histTime: { fontSize: 13, color: c.muted, minWidth: 40 },
    histQty: { fontSize: 14, fontWeight: '800', minWidth: 44 },
    histMeta: { flex: 1, fontSize: 13, color: c.muted },
    strike: { textDecorationLine: 'line-through', color: c.muted },
    voidBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    changeRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    changeTop: { fontSize: 14, color: c.text },
    changeWas: { color: c.muted, textDecorationLine: 'line-through' },
    changeMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
    histHint: { marginTop: 12, fontSize: 12, color: c.muted, textAlign: 'center' },
  });
}
