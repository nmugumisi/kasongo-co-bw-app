import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconDel } from '../theme/zbsIcons';
import { DARK } from '../theme/zbsColors';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
];

// The passcode gate is always rendered on the dark palette, like the web app's sign-in screen.
export default function NumericKeypad({ onPress, disabled }) {
  return (
    <View style={styles.pad}>
      {ROWS.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key, i) => (
            <View key={i} style={styles.cell}>
              {key === '' ? null : (
                <TouchableOpacity style={styles.key} disabled={disabled} onPress={() => onPress(key)} activeOpacity={0.6}>
                  {key === 'back' ? <IconDel size={26} color={DARK.muted} /> : <Text style={styles.keyText}>{key}</Text>}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { width: '100%', maxWidth: 340, gap: 16 },
  row: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1, alignItems: 'center' },
  key: {
    width: '100%',
    maxWidth: 88,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: DARK.card,
    borderWidth: 1,
    borderColor: DARK.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 30, fontWeight: '600', color: DARK.text },
});
