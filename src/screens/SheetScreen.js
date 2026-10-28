import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSheet,
  saveLines,
  addReceipt,
  voidReceipt as apiVoidReceipt,
  addNote,
  deleteNote,
} from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { IconBack, IconSearch, IconLock } from '../theme/zbsIcons';
import { calc } from '../utils/calc';
import { fmt, signed, niceDate, people, titleCase, money } from '../utils/format';
import ItemEditorModal from '../components/ItemEditorModal';
import NotesModal from '../components/NotesModal';

const MODES = [
  { key: 'count', label: 'Stock' },
  { key: 'sales', label: 'Sales' },
  { key: 'deliveries', label: 'Deliveries' },
];

function randomClientId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function liveReceipts(it) {
  return (it.receipts || []).filter((r) => !r.voided).length;
}

export default function SheetScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const c = useZbsColors();
  const { settings } = useAuth();
  const sheetId = route.params?.sheetId;

  const [sheet, setSheet] = useState(null);
  const [prev, setPrev] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('count');
  const [filter, setFilter] = useState('all');
  const [group, setGroup] = useState('');
  const [q, setQ] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [editorItemId, setEditorItemId] = useState(null);
  const [editorQueueIds, setEditorQueueIds] = useState([]);
  const [notesVisible, setNotesVisible] = useState(false);

  const pendingRef = useRef({}); // itemId -> {pos?, count?}
  const saveTimer = useRef(null);
  const styles = useMemo(() => makeStyles(c), [c]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getSheet(sheetId);
      setSheet(d.sheet);
      setPrev(d.prev);
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isClosed = sheet?.status === 'closed';

  function mergeItemState(state) {
    setItems((prevItems) => prevItems.map((it) => (it.id === state.item_id ? { ...it, ...state } : it)));
  }

  function flush() {
    clearTimeout(saveTimer.current);
    const batch = pendingRef.current;
    const ids = Object.keys(batch);
    if (!ids.length) return;
    pendingRef.current = {};
    setSaveState('saving');
    saveLines(sheetId, batch)
      .then((res) => {
        ids.forEach((id) => {
          const state = res.items?.[id];
          if (state) mergeItemState(state);
        });
        setSaveState(Object.keys(pendingRef.current).length ? 'pending' : 'saved');
      })
      .catch(() => {
        ids.forEach((id) => {
          pendingRef.current[id] = { ...batch[id], ...pendingRef.current[id] };
        });
        setSaveState('error');
      });
  }

  function queueFieldChange(itemId, field, value) {
    setItems((prevItems) => prevItems.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)));
    pendingRef.current[itemId] = { ...pendingRef.current[itemId], [field]: value };
    setSaveState('pending');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 700);
  }

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  async function handleLogReceipt(itemId, qty, note) {
    const state = await addReceipt(sheetId, { item_id: itemId, qty, note, client_id: randomClientId() });
    mergeItemState(state);
    return state;
  }

  async function handleVoidReceipt(itemId, rid) {
    const state = await apiVoidReceipt(sheetId, rid);
    mergeItemState(state);
    return state;
  }

  async function handleAddNote(body) {
    const notes_list = await addNote(sheetId, body);
    setSheet((s) => ({ ...s, notes_list }));
  }

  async function handleDeleteNote(nid) {
    const notes_list = await deleteNote(sheetId, nid);
    setSheet((s) => ({ ...s, notes_list }));
  }

  const groups = useMemo(() => {
    const seen = new Set();
    const out = [];
    items.forEach((it) => {
      if (!seen.has(it.group)) {
        seen.add(it.group);
        out.push(it.group);
      }
    });
    return out;
  }, [items]);

  const stats = useMemo(() => {
    const t = { todo: 0, counted: 0, needs: 0, vars: 0, short: 0, shortQty: 0 };
    items.forEach((it) => {
      const cc = calc(it);
      if (cc.counted) t.counted++;
      if (cc.counted || cc.available > 0) t.needs++;
      if (cc.todo) t.todo++;
      if (cc.counted && cc.variance !== 0) {
        t.vars++;
        if (cc.variance < 0) {
          t.short += cc.variance * (it.price || 0);
          t.shortQty += cc.variance;
        }
      }
    });
    return t;
  }, [items]);

  const visibleItems = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((it) => {
      if (group && it.group !== group) return false;
      if (qq && `${it.name} ${it.group}`.toLowerCase().indexOf(qq) === -1) return false;
      const cc = calc(it);
      if (filter === 'todo') return cc.todo;
      if (filter === 'var') return cc.counted && cc.variance !== 0;
      if (filter === 'active') return cc.available > 0 || it.pos > 0 || cc.counted;
      return true;
    });
  }, [items, group, q, filter]);

  const sections = useMemo(() => {
    const byGroup = new Map();
    visibleItems.forEach((it) => {
      if (!byGroup.has(it.group)) byGroup.set(it.group, []);
      byGroup.get(it.group).push(it);
    });
    return Array.from(byGroup.entries());
  }, [visibleItems]);

  function primaryFor(it, cc) {
    if (mode === 'sales') return { val: it.pos ? fmt(it.pos) : '0', lbl: 'sold' };
    if (mode === 'deliveries') return { val: cc.received ? fmt(cc.received) : '0', lbl: 'in' };
    return { val: cc.counted ? fmt(it.count) : '-', lbl: 'in stock' };
  }

  function openEditor(id, queue) {
    setEditorQueueIds((queue || visibleItems.map((it) => it.id)));
    setEditorItemId(id);
  }

  // Jumping in from Review & close ("Still to count" / "Variances" rows) opens straight into that item.
  const jumpId = route.params?.openItemId;
  useEffect(() => {
    if (jumpId && items.length) {
      openEditor(jumpId, [jumpId]);
      navigation.setParams({ openItemId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpId, items.length]);

  if (loading || !sheet) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const pct = stats.needs ? Math.round((stats.counted / stats.needs) * 100) : 0;
  // Frozen at open time, like the web app: editing an item shouldn't make it vanish mid-edit
  // just because it no longer matches the active filter (e.g. counting something under "Waiting for count").
  const editorItems = editorQueueIds.map((id) => items.find((it) => it.id === id)).filter(Boolean);
  const editorIndex = editorQueueIds.indexOf(editorItemId);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <IconBack size={20} color={c.text} />
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.titleStrong} numberOfLines={1}>
            {niceDate(sheet.date)}
          </Text>
          <Text style={styles.titleSmall} numberOfLines={1}>
            {people(sheet.contributors, sheet.cashier)}
            {isClosed ? ' · Closed' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.notesBtn} onPress={() => setNotesVisible(true)}>
          <Text style={styles.notesBtnText}>Notes</Text>
          {sheet.notes_list?.length ? (
            <View style={styles.notesBadge}>
              <Text style={styles.notesBadgeText}>{sheet.notes_list.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.saveIndicator}>
          {isClosed ? (
            <>
              <IconLock size={13} color={c.muted} />
              <Text style={styles.saveText}>Locked</Text>
            </>
          ) : (
            <>
              <View style={[styles.saveDot, { backgroundColor: saveState === 'saved' ? c.pos : saveState === 'error' ? c.neg : c.warn }]} />
              <Text style={styles.saveText}>
                {{ saved: 'Saved', saving: 'Saving…', pending: 'Unsaved', error: 'Retrying' }[saveState]}
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: c.accent }]} />
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <IconSearch size={16} color={c.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${items.length} items`}
            placeholderTextColor={c.muted}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>
      <View style={styles.seg}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.segBtn, mode === m.key && { backgroundColor: c.accent }]}
            onPress={() => setMode(m.key)}
          >
            <Text style={[styles.segBtnText, { color: mode === m.key ? c.accentInk : c.muted }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {[
          { val: 'all', label: 'All' },
          { val: 'todo', label: `Waiting for count ${stats.todo}` },
          { val: 'var', label: `Variances ${stats.vars}` },
          { val: 'active', label: 'In stock' },
        ].map((f) => (
          <TouchableOpacity
            key={f.val}
            style={[styles.chip, filter === f.val && { backgroundColor: c.text, borderColor: c.text }]}
            onPress={() => setFilter(f.val)}
          >
            <Text style={[styles.chipText, { color: filter === f.val ? c.bg : c.muted }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={[styles.chipSep, { backgroundColor: c.line }]} />
        {groups.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, group === g && { backgroundColor: c.text, borderColor: c.text }]}
            onPress={() => setGroup(group === g ? '' : g)}
          >
            <Text style={[styles.chipText, { color: group === g ? c.bg : c.muted }]}>{titleCase(g)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isClosed ? (
        <View style={[styles.banner, { backgroundColor: `${c.accent}24` }]}>
          <Text style={[styles.bannerText, { color: c.text }]}>Closed sheet. You can still correct it.</Text>
        </View>
      ) : prev === null ? (
        <View style={[styles.banner, { backgroundColor: c.warnBg }]}>
          <Text style={[styles.bannerText, { color: c.warn }]}>
            First sheet: there's no earlier closing to carry, so every opening is 0. Record starting stock with + Add.
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
        {!visibleItems.length ? (
          <Text style={styles.empty}>
            {filter === 'todo' ? 'Everything with stock is counted.' : filter === 'var' ? 'No variances. Clean count.' : 'Nothing matches.'}
          </Text>
        ) : (
          sections.map(([g, rows]) => (
            <View key={g} style={styles.group}>
              <Text style={styles.groupH}>{titleCase(g)}</Text>
              {rows.map((it) => {
                const cc = calc(it);
                const p = primaryFor(it, cc);
                const accentColor = cc.counted ? (cc.variance < 0 ? c.neg : cc.variance > 0 ? c.pos : 'transparent') : cc.todo ? c.warn : 'transparent';
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.item, { borderLeftColor: accentColor }]}
                    onPress={() => openEditor(it.id)}
                  >
                    <View style={styles.itemMain}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <View style={styles.itemMeta}>
                        <Text style={styles.metaText}>
                          Open <Text style={styles.metaBold}>{fmt(it.open)}</Text>
                        </Text>
                        {cc.received ? (
                          <Text style={styles.metaText}>
                            In <Text style={styles.metaBold}>{fmt(cc.received)}</Text>
                            {liveReceipts(it) > 1 ? ` ×${liveReceipts(it)}` : ''}
                          </Text>
                        ) : null}
                        {it.pos ? (
                          <Text style={styles.metaText}>
                            Sold <Text style={styles.metaBold}>{fmt(it.pos)}</Text>
                          </Text>
                        ) : null}
                        <Text style={styles.metaText}>
                          Exp <Text style={styles.metaBold}>{fmt(cc.expected)}</Text>
                        </Text>
                        {it.changes?.length ? (
                          <View style={[styles.editedBadge, { backgroundColor: `${c.accent}38` }]}>
                            <Text style={[styles.editedBadgeText, { color: c.text }]}>edited</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.itemSide}>
                      <Text style={styles.itemVal}>{p.val}</Text>
                      <Text style={styles.itemLbl}>{p.lbl}</Text>
                      {cc.counted ? (
                        cc.variance === 0 ? (
                          <View style={[styles.varBadge, { backgroundColor: c.posBg }]}>
                            <Text style={[styles.varBadgeText, { color: c.pos }]}>✓</Text>
                          </View>
                        ) : (
                          <View style={[styles.varBadge, { backgroundColor: cc.variance < 0 ? c.negBg : c.posBg }]}>
                            <Text style={[styles.varBadgeText, { color: cc.variance < 0 ? c.neg : c.pos }]}>{signed(cc.variance)}</Text>
                          </View>
                        )
                      ) : cc.todo ? (
                        <View style={[styles.varBadge, { backgroundColor: c.warnBg }]}>
                          <Text style={[styles.varBadgeText, { color: c.warn }]}>to count</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bottomStats}>
          <View>
            <Text style={styles.bottomStatSmall}>Counted</Text>
            <Text style={styles.bottomStatBig}>
              {stats.counted}/{stats.needs}
            </Text>
          </View>
          <View>
            <Text style={styles.bottomStatSmall}>Short</Text>
            <Text style={[styles.bottomStatBig, stats.short < 0 && { color: c.neg }]}>
              {settings.show_values ? money(stats.short, settings.currency) : fmt(Math.abs(stats.shortQty))}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: c.accent }]}
          onPress={() => navigation.navigate('Review', { sheetId })}
        >
          <Text style={[styles.primaryBtnText, { color: c.accentInk }]}>{isClosed ? 'Summary' : 'Review & close'}</Text>
        </TouchableOpacity>
      </View>

      <ItemEditorModal
        visible={editorItemId !== null}
        items={editorItems}
        startIndex={editorIndex}
        mode={mode}
        isClosed={isClosed}
        prevSheet={prev}
        onClose={() => {
          setEditorItemId(null);
          setEditorQueueIds([]);
        }}
        onChangeField={queueFieldChange}
        onLogReceipt={handleLogReceipt}
        onVoidReceipt={handleVoidReceipt}
      />

      <NotesModal
        visible={notesVisible}
        notes={sheet.notes_list ?? []}
        onClose={() => setNotesVisible(false)}
        onAdd={handleAddNote}
        onDelete={handleDeleteNote}
      />
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    titleCol: { flex: 1, minWidth: 0 },
    titleStrong: { fontSize: 18, fontWeight: '700', color: c.text },
    titleSmall: { fontSize: 13, color: c.muted, marginTop: 1 },
    notesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 6 },
    notesBtnText: { fontSize: 14, fontWeight: '600', color: c.muted },
    notesBadge: { backgroundColor: c.accent, borderRadius: 999, minWidth: 18, paddingHorizontal: 5, alignItems: 'center' },
    notesBadgeText: { fontSize: 11, fontWeight: '800', color: c.accentInk },
    saveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    saveDot: { width: 7, height: 7, borderRadius: 4 },
    saveText: { fontSize: 12, fontWeight: '600', color: c.muted },
    progressTrack: { height: 4, borderRadius: 4, backgroundColor: c.card2, marginHorizontal: 14, marginBottom: 10, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    controlsRow: { paddingHorizontal: 14, marginBottom: 8 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 42,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    searchInput: { flex: 1, fontSize: 16, color: c.text, height: 40 },
    seg: { flexDirection: 'row', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 3, marginHorizontal: 14, marginBottom: 10 },
    segBtn: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    segBtnText: { fontSize: 14, fontWeight: '600' },
    chipsRow: { maxHeight: 40, marginBottom: 6 },
    chipsContent: { paddingHorizontal: 14, gap: 6, alignItems: 'center' },
    chip: { height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 13, fontWeight: '600' },
    chipSep: { width: 1, height: 24, marginHorizontal: 2 },
    banner: { marginHorizontal: 14, marginTop: 4, padding: 10, borderRadius: 12 },
    bannerText: { fontSize: 13 },
    list: { flex: 1, paddingHorizontal: 14 },
    empty: { textAlign: 'center', color: c.muted, paddingVertical: 40 },
    group: { marginBottom: 6 },
    groupH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, paddingTop: 14, paddingBottom: 8 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      marginBottom: 8,
      borderRadius: 14,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
      borderLeftWidth: 4,
    },
    itemMain: { flex: 1, minWidth: 0, gap: 4 },
    itemName: { fontSize: 15, fontWeight: '600', color: c.text },
    itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, rowGap: 4 },
    metaText: { fontSize: 12, color: c.muted },
    metaBold: { color: c.text, fontWeight: '600' },
    editedBadge: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
    editedBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    itemSide: { alignItems: 'flex-end', minWidth: 64, gap: 2 },
    itemVal: { fontSize: 22, fontWeight: '750', color: c.text, letterSpacing: -0.3 },
    itemLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted },
    varBadge: { marginTop: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    varBadgeText: { fontSize: 12, fontWeight: '700' },
    bottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingTop: 12,
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    bottomStats: { flex: 1, flexDirection: 'row', gap: 18 },
    bottomStatSmall: { fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    bottomStatBig: { fontSize: 17, fontWeight: '700', color: c.text },
    primaryBtn: { height: 50, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontSize: 16, fontWeight: '700' },
  });
}
