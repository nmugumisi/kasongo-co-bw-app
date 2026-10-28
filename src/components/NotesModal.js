import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function NotesModal({ visible, notes, onClose, onAdd, onDelete }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(body.trim());
      setBody('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Notes</Text>

          <FlatList
            data={notes}
            keyExtractor={(n) => String(n.id)}
            style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No notes on this sheet yet.</Text>}
            renderItem={({ item: n }) => (
              <View style={styles.noteRow}>
                <View style={styles.flex1}>
                  <Text style={styles.noteBody}>{n.body}</Text>
                  <Text style={styles.noteMeta}>
                    {n.by} · {n.when}
                  </Text>
                </View>
                {n.can_delete ? (
                  <TouchableOpacity onPress={() => onDelete(n.id)}>
                    <Text style={styles.deleteLink}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          />

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Write a note…"
              placeholderTextColor="#888"
              value={body}
              onChangeText={setBody}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Adding…' : 'Add note'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, maxHeight: '80%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  title: { fontSize: 18, fontFamily: FONTS.semiBold, color: colors.ink, marginBottom: 12 },
  list: { maxHeight: 260 },
  empty: { fontSize: 13, fontFamily: FONTS.regular, color: colors.subtleText, paddingVertical: 12 },
  noteRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  flex1: { flex: 1 },
  noteBody: { fontSize: 14, fontFamily: FONTS.regular, color: colors.ink },
  noteMeta: { fontSize: 11, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 3 },
  deleteLink: { fontSize: 13, fontFamily: FONTS.medium, color: colors.danger, marginLeft: 8 },
  form: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: colors.ink,
    minHeight: 60,
  },
  button: { backgroundColor: colors.brand, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#fff' },
});
