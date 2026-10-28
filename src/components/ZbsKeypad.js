import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconDel, IconNext } from '../theme/zbsIcons';
import { useZbsColors } from '../theme/zbsColors';

export default function ZbsKeypad({ onKey, disabled, clearDisabled, nextLabel, isLog }) {
  const c = useZbsColors();

  function Key({ keyName, label, fn, go, keyDisabled, children }) {
    return (
      <TouchableOpacity
        style={[
          styles.key,
          { backgroundColor: fn ? c.card2 : c.card, borderColor: c.line },
          go && { backgroundColor: c.accent, borderColor: 'transparent' },
        ]}
        disabled={keyDisabled}
        activeOpacity={0.7}
        onPress={() => onKey(keyName)}
      >
        {children ?? (
          <Text
            style={[
              styles.keyText,
              { color: fn ? c.muted : c.text },
              go && { color: c.accentInk, fontWeight: '800' },
              fn && styles.keyTextFn,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.grid}>
      <Key keyName="1" label="1" keyDisabled={disabled} />
      <Key keyName="2" label="2" keyDisabled={disabled} />
      <Key keyName="3" label="3" keyDisabled={disabled} />
      <Key keyName="back" fn keyDisabled={disabled}>
        <IconDel size={20} color={c.muted} />
      </Key>

      <Key keyName="4" label="4" keyDisabled={disabled} />
      <Key keyName="5" label="5" keyDisabled={disabled} />
      <Key keyName="6" label="6" keyDisabled={disabled} />
      <Key keyName="clear" label="Clear" fn keyDisabled={disabled || clearDisabled} />

      <Key keyName="7" label="7" keyDisabled={disabled} />
      <Key keyName="8" label="8" keyDisabled={disabled} />
      <Key keyName="9" label="9" keyDisabled={disabled} />
      <Key keyName="minus" label="−1" fn keyDisabled={disabled} />

      <Key keyName="." label="." keyDisabled={disabled} />
      <Key keyName="0" label="0" keyDisabled={disabled} />
      <Key keyName="plus" label="+1" fn keyDisabled={disabled} />
      <Key keyName="next" go keyDisabled={false}>
        <View style={styles.nextRow}>
          <Text style={[styles.keyText, { color: c.accentInk, fontWeight: '800', fontSize: isLog ? 13 : 17 }]} numberOfLines={1}>
            {nextLabel}
          </Text>
          {!isLog ? <IconNext size={16} color={c.accentInk} /> : null}
        </View>
      </Key>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: '23.5%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 22, fontWeight: '600' },
  keyTextFn: { fontSize: 14 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
