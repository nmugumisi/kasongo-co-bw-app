import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getItems, createItem, updateItem, deleteItem } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { IconSearch, IconClose } from '../theme/zbsIcons';
import { fmt, money, titleCase } from '../utils/format';
import SuggestedItems from './SuggestedItems';

export default function ItemsPanel() {
  const c = useZbsColors();
  const cushion = useBottomCushion(32);
  const { settings } = useAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [panel, setPanel] = useState(undefined); // undefined = closed, null = new, number = edit id
  const [lastGroup, setLastGroup] = useState('');
  const styles = makeStyles(c);

  const load = useCallback(async () => {
    try {
      setItems(await getItems());
    } catch (e) {
      setItems((s) => s ?? []);
      Alert.alert('Could not load items', e.message || 'Something went wrong.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const groups = useMemo(() => {
    const seen = new Set();
    (items || []).forEach((it) => seen.add(it.group));
    return Array.from(seen);
  }, [items]);

  const sections = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const map = new Map();
    (items || [])
      .filter((it) => !qq || `${it.name} ${it.group}`.toLowerCase().includes(qq))
      .forEach((it) => {
        if (!map.has(it.group)) map.set(it.group, []);
        map.get(it.group).push(it);
      });
    return Array.from(map.entries());
  }, [items, q]);

  const active = items ? items.filter((i) => i.active).length : 0;
  const editing = typeof panel === 'number' ? (items || []).find((x) => x.id === panel) : null;

  function saved(item) {
    setItems((prev) => {
      const list = prev || [];
      const i = list.findIndex((x) => x.id === item.id);
      const next = i === -1 ? [...list, item] : list.map((x) => (x.id === item.id ? item : x));
      return next.sort((a, b) => a.sort - b.sort || a.id - b.id);
    });
    setPanel(undefined);
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: cushion }]} keyboardShouldPersistTaps="handled">
        <SuggestedItems onAdded={load} />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={() => setPanel(null)}>
          <Text style={[styles.addBtnText, { color: c.accentInk }]}>+ Add item</Text>
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <IconSearch size={18} color={c.muted} />
          <TextInput style={styles.searchInput} placeholder="Search items" placeholderTextColor={c.muted} value={q} onChangeText={setQ} />
        </View>

        {items ? (
          <Text style={styles.hint}>
            {active} active · {items.length - active} switched off. Switched-off items don't appear on new sheets.
          </Text>
        ) : null}

        {!items ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 20 }} />
        ) : !sections.length ? (
          <Text style={styles.empty}>{items.length ? 'Nothing matches.' : 'No items yet. Add one above.'}</Text>
        ) : (
          sections.map(([g, rows]) => (
            <View key={g}>
              <Text style={styles.groupH}>{titleCase(g)}</Text>
              <View style={styles.mini}>
                {rows.map((it, i) => (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.miniRow, i === rows.length - 1 && styles.lastRow, !it.active && styles.off]}
                    onPress={() => setPanel(it.id)}
                  >
                    <Text style={styles.miniLabel} numberOfLines={1}>
                      {it.name}
                    </Text>
                    {!it.active ? (
                      <View style={styles.offBadge}>
                        <Text style={styles.offBadgeText}>off</Text>
                      </View>
                    ) : null}
                    {settings.show_values ? (
                      <Text style={styles.miniSmall}>{it.price ? money(it.price, settings.currency) : 'no price'}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ItemModal
        visible={panel !== undefined}
        item={editing}
        groups={groups}
        defaultGroup={lastGroup}
        showValues={settings.show_values}
        currency={settings.currency}
        onClose={() => setPanel(undefined)}
        onSaved={(it) => {
          setLastGroup(it.group);
          saved(it);
        }}
        onDeleted={(id) => {
          setItems((prev) => (prev || []).filter((x) => x.id !== id));
          setPanel(undefined);
        }}
      />
    </View>
  );
}

function ItemModal({ visible, item, groups, defaultGroup, showValues, currency, onClose, onSaved, onDeleted }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(32);
  const styles = makeStyles(c);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setName(item ? item.name : '');
    setGroup(item ? item.group : defaultGroup || '');
    setPrice(item && item.price ? fmt(item.price) : '');
    setIsActive(item ? item.active : true);
    setError(null);
  }, [visible, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const suggestions = group.trim()
    ? groups.filter((g) => g.toLowerCase().includes(group.trim().toLowerCase()) && g.toLowerCase() !== group.trim().toLowerCase()).slice(0, 4)
    : [];

  async function handleSave() {
    if (!name.trim() || !group.trim()) {
      setError('Enter a name and a group.');
      return;
    }
    const p = price.trim().replace(',', '.');
    if (showValues && p !== '' && !/^\d+(\.\d{1,2})?$/.test(p)) {
      setError('Price must be a number like 2.50');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), group: group.trim() };
      if (showValues) body.price = p === '' ? 0 : p;
      const saved = item ? await updateItem(item.id, { ...body, active: isActive }) : await createItem(body);
      onSaved(saved);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    Alert.alert(`Delete ${item.name}?`, "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(item.id);
            onDeleted(item.id);
          } catch (e) {
            Alert.alert('Could not delete', e.message || 'Something went wrong.');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <View style={styles.flex1}>
              <Text style={styles.title}>{item ? item.name : 'Add item'}</Text>
              {item ? (
                <Text style={styles.headSub}>
                  {titleCase(item.group)}
                  {item.in_use ? ' · on past sheets' : ''}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={120} placeholder="e.g. Savanna Dry 330ml" placeholderTextColor={c.muted} />

          <Text style={[styles.fieldLabel, styles.gapTop]}>Group</Text>
          <TextInput
            style={styles.input}
            value={group}
            onChangeText={setGroup}
            autoCapitalize="characters"
            placeholder="e.g. CIDERS"
            placeholderTextColor={c.muted}
          />
          {suggestions.length ? (
            <View style={styles.suggestRow}>
              {suggestions.map((g) => (
                <TouchableOpacity key={g} style={styles.suggest} onPress={() => setGroup(g)}>
                  <Text style={styles.suggestText}>{titleCase(g)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {showValues ? (
            <>
              <Text style={[styles.fieldLabel, styles.gapTop]}>Unit price {currency ? `(${currency})` : ''}</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={c.muted} />
            </>
          ) : null}

          {item ? (
            <View style={styles.switchRow}>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: c.accent, false: c.card2 }} thumbColor={c.muted} />
              <Text style={styles.switchLabel}>On the stock sheet</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent }]} onPress={handleSave} disabled={busy}>
            <Text style={[styles.saveBtnText, { color: c.accentInk }]}>{busy ? 'Saving…' : item ? 'Save' : 'Add item'}</Text>
          </TouchableOpacity>

          {item ? (
            <View style={styles.panelActions}>
              {item.in_use ? (
                <Text style={styles.hint}>On past sheets, so it can't be deleted. Switch it off instead.</Text>
              ) : (
                <TouchableOpacity style={[styles.panelBtn, { borderColor: `${c.neg}66` }]} onPress={handleDelete}>
                  <Text style={[styles.panelBtnText, { color: c.neg }]}>Delete item</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1 },
    flex1: { flex: 1 },
    main: { padding: 14, paddingTop: 4, paddingBottom: 32 },
    addBtn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontSize: 17, fontWeight: '700' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, marginTop: 12 },
    searchInput: { flex: 1, fontSize: 16, color: c.text, height: 46 },
    hint: { fontSize: 13, color: c.muted, marginTop: 10, textAlign: 'center', lineHeight: 18 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 30 },
    groupH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, paddingTop: 16, paddingBottom: 8 },
    mini: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, overflow: 'hidden' },
    miniRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line },
    lastRow: { borderBottomWidth: 0 },
    off: { opacity: 0.55 },
    miniLabel: { flex: 1, fontSize: 15, color: c.text },
    miniSmall: { fontSize: 13, color: c.muted },
    offBadge: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: c.card2 },
    offBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: c.muted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 28 },
    grab: { width: 42, height: 5, borderRadius: 5, backgroundColor: c.card2, alignSelf: 'center', marginBottom: 8 },
    head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 17, fontWeight: '700', color: c.text },
    headSub: { fontSize: 12, color: c.muted, marginTop: 2 },
    closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    gapTop: { marginTop: 14 },
    input: { height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, color: c.text, fontSize: 16 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    suggest: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    suggestText: { fontSize: 13, color: c.text },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: c.text },
    error: { color: c.neg, fontSize: 14, fontWeight: '600', marginTop: 12 },
    saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    saveBtnText: { fontSize: 16, fontWeight: '700' },
    panelActions: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line },
    panelBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1 },
    panelBtnText: { fontSize: 15, fontWeight: '600' },
  });
}
