import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';
import { formatQty } from '../utils/format';

export default function ReceiptModal({ visible, item, onClose, onSubmit, onVoid }) {
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setQty('');
      setNote('');
    }
  }, [visible, item?.id]);

  if (!item) return null;

  async function handleSubmit() {
    const n = Number(String(qty).replace(',', '.'));
    if (!n || n <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit(n, note);
      setQty('');
      setNote('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.subtitle}>Log a delivery</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Quantity received"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
              value={qty}
              onChangeText={setQty}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.inputSpacing]}
              placeholder="Note (optional)"
              placeholderTextColor="#888"
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Adding…' : 'Add delivery'}</Text>
            </TouchableOpacity>
          </View>

          {item.receipts?.length ? (
            <>
              <Text style={styles.historyTitle}>Today&apos;s deliveries</Text>
              <FlatList
                data={item.receipts}
                keyExtractor={(r) => String(r.id)}
                style={styles.history}
                renderItem={({ item: r }) => (
                  <View style={[styles.receiptRow, r.voided && styles.receiptVoided]}>
                    <View style={styles.flex1}>
                      <Text style={styles.receiptText}>
                        +{formatQty(r.qty)} · {r.time} · {r.by}
                        {r.voided ? ' (voided)' : ''}
                      </Text>
                      {r.note ? <Text style={styles.receiptNote}>{r.note}</Text> : null}
                    </View>
                    {r.can_void ? (
                      <TouchableOpacity onPress={() => onVoid(r.id)}>
                        <Text style={styles.voidLink}>Void</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              />
            </>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, maxHeight: '75%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  title: { fontSize: 18, fontFamily: FONTS.semiBold, color: colors.ink },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 2, marginBottom: 16 },
  form: {},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: colors.ink,
  },
  inputSpacing: { marginTop: 10 },
  button: { backgroundColor: colors.brand, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#fff' },
  historyTitle: { fontSize: 13, fontFamily: FONTS.semiBold, color: colors.subtleText, marginTop: 20, marginBottom: 6 },
  history: { maxHeight: 180 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  receiptVoided: { opacity: 0.5 },
  flex1: { flex: 1 },
  receiptText: { fontSize: 13, fontFamily: FONTS.regular, color: colors.ink },
  receiptNote: { fontSize: 12, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 1 },
  voidLink: { fontSize: 13, fontFamily: FONTS.medium, color: colors.danger },
});
