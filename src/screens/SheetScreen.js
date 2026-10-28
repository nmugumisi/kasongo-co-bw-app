import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import {
  createSheet,
  getSheet,
  saveLines,
  addReceipt,
  voidReceipt,
  addNote,
  deleteNote,
  closeSheet,
} from '../services/api';
import { useAuth } from '../utils/AuthContext';
import ItemRow from '../components/ItemRow';
import ReceiptModal from '../components/ReceiptModal';
import NotesModal from '../components/NotesModal';
import StatusBadge from '../components/StatusBadge';
import OfflineBanner from '../components/OfflineBanner';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';
import { formatQty, formatMoney } from '../utils/format';

function randomClientId() {
  return `c_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export default function SheetScreen() {
  const route = useRoute();
  const sheetId = route.params?.sheetId ?? null;
  const { settings } = useAuth();

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [notesVisible, setNotesVisible] = useState(false);

  const load = useCallback(
    async ({ background = false } = {}) => {
      if (!background) setLoading(true);
      try {
        const data = sheetId ? await getSheet(sheetId) : await createSheet({});
        setPayload(data);
      } catch (e) {
        Alert.alert('Could not load sheet', e.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    },
    [sheetId]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        setShowOfflineBanner(true);
        return;
      }
      await load({ background: true });
    } finally {
      setRefreshing(false);
    }
  }

  function mergeItem(itemState) {
    setPayload((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it) => (it.id === itemState.item_id ? { ...it, ...itemState } : it));
      return { ...prev, items };
    });
  }

  async function handlePosChange(itemId, pos) {
    try {
      const res = await saveLines(payload.sheet.id, { [itemId]: { pos } });
      const state = res.items?.[itemId];
      if (state) mergeItem(state);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Something went wrong.');
    }
  }

  async function handleCountChange(itemId, count) {
    try {
      const res = await saveLines(payload.sheet.id, { [itemId]: { count } });
      const state = res.items?.[itemId];
      if (state) mergeItem(state);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Something went wrong.');
    }
  }

  async function handleAddReceipt(qty, note) {
    try {
      const state = await addReceipt(payload.sheet.id, {
        item_id: activeReceiptId,
        qty,
        note,
        client_id: randomClientId(),
      });
      mergeItem(state);
    } catch (e) {
      Alert.alert('Could not add delivery', e.message || 'Something went wrong.');
    }
  }

  async function handleVoidReceipt(rid) {
    try {
      const state = await voidReceipt(payload.sheet.id, rid);
      mergeItem(state);
    } catch (e) {
      Alert.alert('Could not void', e.message || 'Something went wrong.');
    }
  }

  async function handleAddNote(body) {
    try {
      const notes_list = await addNote(payload.sheet.id, body);
      setPayload((prev) => ({ ...prev, sheet: { ...prev.sheet, notes_list } }));
    } catch (e) {
      Alert.alert('Could not add note', e.message || 'Something went wrong.');
    }
  }

  async function handleDeleteNote(nid) {
    try {
      const notes_list = await deleteNote(payload.sheet.id, nid);
      setPayload((prev) => ({ ...prev, sheet: { ...prev.sheet, notes_list } }));
    } catch (e) {
      Alert.alert('Could not delete note', e.message || 'Something went wrong.');
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      const data = await closeSheet(payload.sheet.id, {});
      setPayload(data);
      Alert.alert('Sheet closed', 'Today’s sheet has been locked for reporting.');
    } catch (e) {
      if (e.status === 422) {
        Alert.alert('Count these items first', e.message);
      } else {
        Alert.alert('Could not close', e.message || 'Something went wrong.');
      }
    } finally {
      setClosing(false);
    }
  }

  const sections = useMemo(() => {
    if (!payload) return [];
    const byGroup = new Map();
    for (const item of payload.items) {
      const key = item.group || 'Other';
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(item);
    }
    return Array.from(byGroup.entries()).map(([title, data]) => ({ title, data }));
  }, [payload]);

  const totals = useMemo(() => {
    if (!payload) return { sales: 0, variance: 0 };
    let sales = 0;
    let variance = 0;
    for (const item of payload.items) {
      sales += Number(item.pos) || 0;
      if (item.count !== null && item.count !== undefined) {
        const available = (Number(item.open) || 0) + (Number(item.received) || 0);
        const expected = available - (Number(item.pos) || 0);
        variance += (Number(item.count) || 0) - expected;
      }
    }
    return { sales: Math.round(sales * 100) / 100, variance: Math.round(variance * 100) / 100 };
  }, [payload]);

  const activeItem = payload?.items.find((it) => it.id === activeReceiptId) ?? null;

  if (loading || !payload) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const { sheet } = payload;
  const isDraft = sheet.status !== 'closed';

  return (
    <View style={styles.container}>
      <OfflineBanner visible={showOfflineBanner} onDismiss={() => setShowOfflineBanner(false)} />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.date}>{sheet.date}</Text>
          <StatusBadge status={sheet.status} />
        </View>
        <Text style={styles.contributors}>
          {sheet.contributors?.length ? sheet.contributors.join(', ') : sheet.cashier}
        </Text>
        <View style={styles.totalsRow}>
          <Text style={styles.totalText}>
            Sales {settings.show_values ? formatMoney(totals.sales, settings.currency) : formatQty(totals.sales)}
          </Text>
          <Text style={[styles.totalText, totals.variance < 0 && styles.totalNegative]}>
            Variance {formatQty(totals.variance)}
          </Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.headerName]}>Item</Text>
        <Text style={styles.headerCell}>Open</Text>
        <Text style={styles.headerCell}>Recv</Text>
        <Text style={styles.headerCell}>P/P</Text>
        <Text style={styles.headerCell}>Count</Text>
        <Text style={styles.headerCell}>Var</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            locked={closing}
            onChangePos={(v) => handlePosChange(item.id, v)}
            onChangeCount={(v) => handleCountChange(item.id, v)}
            onAddReceipt={() => setActiveReceiptId(item.id)}
          />
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        stickySectionHeadersEnabled
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => setNotesVisible(true)}>
          <Text style={styles.footerButtonText}>Notes ({sheet.notes_list?.length ?? 0})</Text>
        </TouchableOpacity>
        {isDraft ? (
          <TouchableOpacity style={[styles.footerButton, styles.closeButton]} onPress={handleClose} disabled={closing}>
            <Text style={styles.closeButtonText}>{closing ? 'Closing…' : 'Close sheet'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ReceiptModal
        visible={!!activeReceiptId}
        item={activeItem}
        onClose={() => setActiveReceiptId(null)}
        onSubmit={handleAddReceipt}
        onVoid={handleVoidReceipt}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  summary: { backgroundColor: colors.card, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 16, fontFamily: FONTS.semiBold, color: colors.ink },
  contributors: { fontSize: 12, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 4 },
  totalsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  totalText: { fontSize: 13, fontFamily: FONTS.medium, color: colors.ink },
  totalNegative: { color: colors.danger },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.bg,
  },
  headerCell: { width: 48, textAlign: 'center', fontSize: 11, fontFamily: FONTS.semiBold, color: colors.subtleText },
  headerName: { flex: 1, width: undefined, textAlign: 'left', paddingRight: 8 },
  sectionHeader: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  sectionTitle: { fontSize: 12, fontFamily: FONTS.semiBold, color: colors.brandDark, textTransform: 'uppercase' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerButtonText: { fontFamily: FONTS.medium, fontSize: 14, color: colors.ink },
  closeButton: { backgroundColor: colors.brand, borderColor: colors.brand },
  closeButtonText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
});
