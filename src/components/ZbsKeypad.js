import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconDel, IconNext } from '../theme/zbsIcons';
import { useZbsColors } from '../theme/zbsColors';

// Four explicit rows of four (each key flex:1) so the grid always fills the width and never
// wraps out of order:  1 2 3 ⌫ / 4 5 6 Clear / 7 8 9 −1 / . 0 +1 Next
export default function ZbsKeypad({ onKey, disabled, clearDisabled, nextLabel, isLog }) {
  const c = useZbsColors();

  function Key({ keyName, label, fn, go, keyDisabled, children }) {
    return (
      <TouchableOpacity
        style={[
          styles.key,
          { backgroundColor: fn ? c.card2 : c.card, borderColor: c.line },
          go && { backgroundColor: c.accent, borderColor: 'transparent' },
          keyDisabled && !go && styles.keyDisabled,
        ]}
        disabled={keyDisabled}
        activeOpacity={0.7}
        onPress={() => onKey(keyName)}
      >
        {children ?? (
          <Text style={[styles.keyText, { color: fn ? c.muted : c.text }, fn && styles.keyTextFn]} numberOfLines={1}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.pad}>
      <View style={styles.row}>
        <Key keyName="1" label="1" keyDisabled={disabled} />
        <Key keyName="2" label="2" keyDisabled={disabled} />
        <Key keyName="3" label="3" keyDisabled={disabled} />
        <Key keyName="back" fn keyDisabled={disabled}>
          <IconDel size={22} color={c.muted} />
        </Key>
      </View>
      <View style={styles.row}>
        <Key keyName="4" label="4" keyDisabled={disabled} />
        <Key keyName="5" label="5" keyDisabled={disabled} />
        <Key keyName="6" label="6" keyDisabled={disabled} />
        <Key keyName="clear" label="Clear" fn keyDisabled={disabled || clearDisabled} />
      </View>
      <View style={styles.row}>
        <Key keyName="7" label="7" keyDisabled={disabled} />
        <Key keyName="8" label="8" keyDisabled={disabled} />
        <Key keyName="9" label="9" keyDisabled={disabled} />
        <Key keyName="minus" label={'−1'} fn keyDisabled={disabled} />
      </View>
      <View style={styles.row}>
        <Key keyName="." label="." keyDisabled={disabled} />
        <Key keyName="0" label="0" keyDisabled={disabled} />
        <Key keyName="plus" label="+1" fn keyDisabled={disabled} />
        <Key keyName="next" go keyDisabled={false}>
          <View style={styles.nextRow}>
            <Text style={[styles.nextText, { color: c.accentInk, fontSize: isLog ? 14 : 17 }]} numberOfLines={1} adjustsFontSizeToFit>
              {nextLabel}
            </Text>
            {!isLog ? <IconNext size={16} color={c.accentInk} /> : null}
          </View>
        </Key>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  keyDisabled: { opacity: 0.4 },
  keyText: { fontSize: 24, fontWeight: '600' },
  keyTextFn: { fontSize: 15 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nextText: { fontWeight: '800' },
});
