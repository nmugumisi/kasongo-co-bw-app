import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
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
  // An explicit size keeps the keys round. (width:'100%' + maxWidth + aspectRatio stretched them into
  // ovals on Android, where the height followed the uncapped width.) 48 = the screen's side padding.
  const { width } = useWindowDimensions();
  const size = Math.floor(Math.min(88, (Math.min(340, width - 48) - 2 * GAP) / 3));
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={styles.pad}>
      {ROWS.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key, i) => (
            <View key={i} style={styles.cell}>
              {key === '' ? null : (
                <TouchableOpacity style={[styles.key, round]} disabled={disabled} onPress={() => onPress(key)} activeOpacity={0.6}>
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

const GAP = 16;

const styles = StyleSheet.create({
  pad: { width: '100%', maxWidth: 340, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  cell: { flex: 1, alignItems: 'center' },
  key: {
    backgroundColor: DARK.card,
    borderWidth: 1,
    borderColor: DARK.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 30, fontWeight: '600', color: DARK.text },
});
