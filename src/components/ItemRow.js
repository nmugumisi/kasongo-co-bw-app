import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';
import { formatQty } from '../utils/format';

function calc(open, received, count, pos) {
  const available = open + received;
  const expected = Math.round((available - pos) * 100) / 100;
  if (count === null || count === undefined) return { variance: 0, counted: false };
  return { variance: Math.round((count - expected) * 100) / 100, counted: true };
}

export default function ItemRow({ item, locked, onChangePos, onChangeCount, onAddReceipt }) {
  const [pos, setPos] = useState(item.pos ? String(item.pos) : '');
  const [count, setCount] = useState(item.count === null || item.count === undefined ? '' : String(item.count));

  const posNum = Number(String(pos).replace(',', '.')) || 0;
  const countNum = count === '' ? null : Number(String(count).replace(',', '.'));
  const { variance, counted } = calc(item.open, item.received, countNum, posNum);
  const short = counted && variance < 0;

  return (
    <View style={styles.row}>
      <View style={styles.nameCol}>
        <Text style={styles.name}>{item.name}</Text>
        {item.receipts?.length ? (
          <Text style={styles.receiptHint}>
            +{formatQty(item.received)} from {item.receipts.length} {item.receipts.length === 1 ? 'delivery' : 'deliveries'}
          </Text>
        ) : null}
      </View>

      <View style={styles.numCol}>
        <Text style={styles.readout}>{formatQty(item.open)}</Text>
      </View>

      <TouchableOpacity style={styles.numCol} onPress={onAddReceipt} disabled={locked}>
        <View style={styles.receivedChip}>
          <Text style={styles.readout}>{formatQty(item.received)}</Text>
          {!locked ? <Plus size={12} color={colors.brandDark} /> : null}
        </View>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, styles.numCol]}
        value={pos}
        onChangeText={setPos}
        onBlur={() => onChangePos(posNum)}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#B9AF9E"
        editable={!locked}
      />

      <TextInput
        style={[styles.input, styles.numCol, styles.countInput]}
        value={count}
        onChangeText={setCount}
        onBlur={() => onChangeCount(count === '' ? null : countNum)}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor="#B9AF9E"
        editable={!locked}
      />

      <View style={styles.numCol}>
        <Text style={[styles.readout, styles.variance, short && styles.varianceShort]}>
          {counted ? formatQty(variance) : '—'}
        </Text>
      </View>
    </View>
  );
}

const COL = 48;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameCol: { flex: 1, paddingRight: 8 },
  name: { fontSize: 14, fontFamily: FONTS.medium, color: colors.ink },
  receiptHint: { fontSize: 11, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 2 },
  numCol: { width: COL, alignItems: 'center', justifyContent: 'center' },
  readout: { fontSize: 13, fontFamily: FONTS.regular, color: colors.ink },
  receivedChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: colors.ink,
    paddingVertical: 4,
  },
  countInput: { borderColor: colors.brand },
  variance: { fontFamily: FONTS.semiBold },
  varianceShort: { color: colors.danger },
});
