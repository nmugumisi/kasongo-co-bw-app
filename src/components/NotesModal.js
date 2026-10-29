import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { IconClose } from '../theme/zbsIcons';

export default function NotesModal({ visible, notes, onClose, onAdd, onDelete, readOnly }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(20);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const styles = makeStyles(c);

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
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <Text style={styles.title}>Notes</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>

          {readOnly ? null : (
            <>
          <TextInput
            style={styles.input}
            placeholder="Breakages, comps, fridge problems, anything the manager should know"
            placeholderTextColor={c.muted}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={handleAdd} disabled={submitting}>
            <Text style={[styles.addBtnText, { color: c.accentInk }]}>{submitting ? 'Adding…' : 'Add note'}</Text>
          </TouchableOpacity>
            </>
          )}

          <ScrollView style={styles.list}>
            {!notes.length ? (
              <Text style={styles.empty}>No notes yet.</Text>
            ) : (
              notes
                .slice()
                .reverse()
                .map((n) => (
                  <View key={n.id} style={styles.noteRow}>
                    <View style={styles.flex1}>
                      <Text style={styles.noteMeta}>
                        <Text style={{ color: c.text, fontWeight: '700' }}>{n.by || '-'}</Text> · {n.when}
                      </Text>
                      <Text style={styles.noteBody}>{n.body}</Text>
                    </View>
                    {n.can_delete && !readOnly ? (
                      <TouchableOpacity onPress={() => onDelete(n.id)} style={styles.delBtn}>
                        <IconClose size={14} color={c.muted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bg2, maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, paddingBottom: 24 },
    grab: { width: 42, height: 5, borderRadius: 5, backgroundColor: c.card2, alignSelf: 'center', marginBottom: 8 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    title: { fontSize: 17, fontWeight: '700', color: c.text },
    closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    input: {
      minHeight: 72,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.card,
      color: c.text,
      fontSize: 15,
      textAlignVertical: 'top',
    },
    addBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    addBtnText: { fontSize: 15, fontWeight: '700' },
    list: { marginTop: 14 },
    empty: { color: c.muted, fontSize: 13, paddingVertical: 10 },
    noteRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
    flex1: { flex: 1 },
    noteMeta: { fontSize: 12, color: c.muted, marginBottom: 3 },
    noteBody: { fontSize: 14, color: c.text, lineHeight: 19 },
    delBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  });
}
