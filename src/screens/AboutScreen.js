import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Image source={require('../../assets/kasongo-icon.png')} style={styles.logo} />
      <Text style={styles.title}>Kasongo</Text>
      <Text style={styles.body}>
        Daily bar stock capture: opening, deliveries, counts and variance per item, grouped like the paper sheet.
        Opening carries forward automatically from the last closed sheet, and every edit to a closed sheet is kept
        in its change history.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: colors.bg },
  logo: { width: 72, height: 72, borderRadius: 16, marginTop: 20, marginBottom: 16 },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: colors.ink, marginBottom: 12 },
  body: { fontSize: 14, fontFamily: FONTS.regular, color: colors.subtleText, textAlign: 'center', lineHeight: 21 },
});
