import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Delete } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

export default function NumericKeypad({ onPress, disabled }) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key, i) =>
        key === '' ? (
          <View key={i} style={styles.key} />
        ) : (
          <TouchableOpacity
            key={i}
            style={styles.key}
            disabled={disabled}
            onPress={() => onPress(key)}
            activeOpacity={0.6}
          >
            {key === 'back' ? (
              <Delete size={24} color={colors.bottomNavFg} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76 },
  key: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 28, fontFamily: FONTS.medium, color: colors.bottomNavFg },
});
