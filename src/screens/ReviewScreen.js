import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSheet, closeSheet, addNote, deleteNote } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { getJSON, sheetCacheKey } from '../utils/offlineStore';
import { IconBack } from '../theme/zbsIcons';
import { calc } from '../utils/calc';
import { fmt, signed, money, niceDate } from '../utils/format';
import NotesModal from '../components/NotesModal';

export default function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const c = useZbsColors();
  const { settings } = useAuth();
  const isOnline = useNetworkStatus();
  const sheetId = route.params?.sheetId;

  const [sheet, setSheet] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [closing, setClosing] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);

  const load = useCallback(async () => {
    const cached = await getJSON(sheetCacheKey(sheetId));
    if (cached) {
      setSheet(cached.sheet);
      setItems(cached.items);
      setLoading(false);
    }
    try {
      const d = await getSheet(sheetId);
      setSheet(d.sheet);
      setItems(d.items);
      setLoadError(null);
    } catch (e) {
      if (!cached) {
        setLoadError(isOnline ? e.message || 'Something went wrong.' : "You're offline and this sheet hasn't been opened on this device before.");
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isClosed = sheet?.status === 'closed';

  const stats = useMemo(() => {
    const t = { sold: 0, net: 0, short: 0, over: 0, shortQty: 0, overQty: 0 };
    items.forEach((it) => {
      const cc = calc(it);
      t.sold += it.pos;
      if (cc.counted && cc.variance !== 0) {
        t.net += cc.variance;
        if (cc.variance < 0) {
          t.short += cc.variance * (it.price || 0);
          t.shortQty += cc.variance;
        } else {
          t.over += cc.variance * (it.price || 0);
          t.overQty += cc.variance;
        }
      }
    });
    return t;
  }, [items]);

  const todo = useMemo(() => items.filter((it) => calc(it).todo), [items]);
  const vars = useMemo(() => {
    return items
      .filter((it) => {
        const cc = calc(it);
        return cc.counted && cc.variance !== 0;
      })
      .sort((a, b) => calc(a).variance - calc(b).variance);
  }, [items]);

  async function handleClose() {
    setClosing(true);
    try {
      const d = await closeSheet(sheetId, {});
      setSheet(d.sheet);
      setItems(d.items);
    } catch (e) {
      Alert.alert('Could not close', e.message || 'Something went wrong.');
    } finally {
      setClosing(false);
    }
  }

  async function handleAddNote(body) {
    const notes_list = await addNote(sheetId, body);
    setSheet((s) => ({ ...s, notes_list }));
  }

  async function handleDeleteNote(nid) {
    const notes_list = await deleteNote(sheetId, nid);
    setSheet((s) => ({ ...s, notes_list }));
  }

  const styles = makeStyles(c);

  if (loading && !sheet) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!sheet) {
    return (
      <View style={[styles.flex, styles.center, { padding: 24 }]}>
        <Text style={styles.empty}>{loadError || "Couldn't load this sheet."}</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: c.accent, marginTop: 16 }]} onPress={() => load()}>
          <Text style={[styles.primaryBtnText, { color: c.accentInk }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <IconBack size={20} color={c.text} />
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.titleStrong}>{isClosed ? 'Summary' : 'Review & close'}</Text>
          <Text style={styles.titleSmall}>
            {niceDate(sheet.date)} · {sheet.cashier}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: insets.bottom + 24 }]}>
        {!isOnline ? (
          <View style={[styles.banner, { backgroundColor: c.warnBg }]}>
            <Text style={{ color: c.warn, fontSize: 13 }}>
              You're offline, showing the last saved copy. {!isClosed ? 'Closing a sheet needs a connection.' : ''}
            </Text>
          </View>
        ) : isClosed ? (
          <View style={[styles.banner, { backgroundColor: c.posBg }]}>
            <Text style={{ color: c.pos, fontSize: 13 }}>
              Closed. Its closing stock is the next sheet's opening. It stays editable; corrections also update the next sheet's opening.
            </Text>
          </View>
        ) : null}

        <View style={styles.kpis}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLbl}>Units sold</Text>
            <Text style={styles.kpiVal}>{fmt(stats.sold)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLbl}>Net variance</Text>
            <Text style={[styles.kpiVal, stats.net < 0 && { color: c.neg }, stats.net > 0 && { color: c.pos }]}>{signed(stats.net)}</Text>
          </View>
          {settings.show_values ? (
            <>
              <View style={styles.kpi}>
                <Text style={styles.kpiLbl}>Shortage value</Text>
                <Text style={[styles.kpiVal, stats.short < 0 && { color: c.neg }]}>{money(stats.short, settings.currency)}</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLbl}>Over value</Text>
                <Text style={[styles.kpiVal, stats.over > 0 && { color: c.pos }]}>{money(stats.over, settings.currency)}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.kpi}>
                <Text style={styles.kpiLbl}>Units short</Text>
                <Text style={[styles.kpiVal, stats.shortQty < 0 && { color: c.neg }]}>{fmt(stats.shortQty)}</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiLbl}>Units over</Text>
                <Text style={[styles.kpiVal, stats.overQty > 0 && { color: c.pos }]}>{fmt(stats.overQty)}</Text>
              </View>
            </>
          )}
        </View>

        {todo.length ? (
          <>
            <Text style={[styles.sectionH, { color: c.warn }]}>Still to count · {todo.length}</Text>
            <View style={styles.mini}>
              {todo.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  style={styles.miniRow}
                  onPress={() => navigation.navigate('Sheet', { sheetId, openItemId: it.id })}
                >
                  <Text style={styles.miniLabel}>{it.name}</Text>
                  <Text style={styles.miniSmall}>exp {fmt(calc(it).expected)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionH}>Variances · {vars.length}</Text>
        {!vars.length ? (
          <Text style={styles.empty}>No variances recorded.</Text>
        ) : (
          <View style={styles.mini}>
            {vars.map((it) => {
              const cc = calc(it);
              return (
                <TouchableOpacity key={it.id} style={styles.miniRow} onPress={() => navigation.navigate('Sheet', { sheetId, openItemId: it.id })}>
                  <Text style={styles.miniLabel}>{it.name}</Text>
                  <Text style={[styles.miniBold, cc.variance < 0 ? { color: c.neg } : { color: c.pos }]}>{signed(cc.variance)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionH}>Notes · {sheet.notes_list?.length ?? 0}</Text>
        {!sheet.notes_list?.length ? (
          <Text style={styles.empty}>No notes on this sheet.</Text>
        ) : (
          <View style={styles.mini}>
            {sheet.notes_list.map((n) => (
              <View key={n.id} style={styles.noteRow}>
                <Text style={styles.noteMeta}>
                  <Text style={{ color: c.text, fontWeight: '700' }}>{n.by}</Text> · {n.when}
                </Text>
                <Text style={styles.noteBody}>{n.body}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.addNoteBtn} onPress={() => setNotesVisible(true)}>
          <Text style={styles.addNoteBtnText}>+ Add a note</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          {!isClosed ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: c.accent }, (todo.length || !isOnline) && styles.disabledBtn]}
              onPress={handleClose}
              disabled={!!todo.length || closing || !isOnline}
            >
              <Text style={[styles.primaryBtnText, { color: c.accentInk }]}>
                {closing ? 'Closing…' : !isOnline ? "Offline — can't close" : todo.length ? `Count ${todo.length} more to close` : 'Close sheet'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Sheet', { sheetId })}>
              <Text style={styles.ghostBtnText}>Correct this sheet</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.ghostBtnText}>All sheets</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    titleCol: { flex: 1, minWidth: 0 },
    titleStrong: { fontSize: 18, fontWeight: '700', color: c.text },
    titleSmall: { fontSize: 13, color: c.muted, marginTop: 1 },
    main: { padding: 14 },
    banner: { borderRadius: 12, padding: 12, marginBottom: 14 },
    kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpi: { width: '47%', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, gap: 4 },
    kpiLbl: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: c.muted },
    kpiVal: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginTop: 22, marginBottom: 10, marginHorizontal: 2 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 16 },
    mini: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, overflow: 'hidden' },
    miniRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
    miniLabel: { flex: 1, color: c.text, fontSize: 14 },
    miniSmall: { color: c.muted, fontSize: 13 },
    miniBold: { fontWeight: '700', fontSize: 14 },
    noteRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
    noteMeta: { fontSize: 12, color: c.muted, marginBottom: 3 },
    noteBody: { fontSize: 14, color: c.text, lineHeight: 19 },
    addNoteBtn: { height: 50, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    addNoteBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
    actions: { gap: 8, marginTop: 20 },
    primaryBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { fontSize: 16, fontWeight: '700' },
    disabledBtn: { opacity: 0.5 },
    ghostBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    ghostBtnText: { fontSize: 15, fontWeight: '600', color: c.text },
  });
}
