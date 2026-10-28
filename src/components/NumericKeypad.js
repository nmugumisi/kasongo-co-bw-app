import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconDel } from '../theme/zbsIcons';
import { DARK } from '../theme/zbsColors';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

// The passcode gate is always rendered on the dark palette, like the web app's sign-in screen.
export default function NumericKeypad({ onPress, disabled }) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key, i) =>
        key === '' ? (
          <View key={i} style={styles.key} />
        ) : (
          <TouchableOpacity
            key={i}
            style={[styles.key, styles.keyRound]}
            disabled={disabled}
            onPress={() => onPress(key)}
            activeOpacity={0.6}
          >
            {key === 'back' ? <IconDel size={22} color={DARK.muted} /> : <Text style={styles.keyText}>{key}</Text>}
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76, justifyContent: 'center' },
  key: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  keyRound: { width: 64, height: 64, borderRadius: 32, backgroundColor: DARK.card, borderWidth: 1, borderColor: DARK.line },
  keyText: { fontSize: 26, fontWeight: '600', color: DARK.text },
});
