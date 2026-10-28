import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function StatusBadge({ status }) {
  const closed = status === 'closed';
  return (
    <View style={[styles.badge, { backgroundColor: closed ? colors.closedBadgeBg : colors.draftBadgeBg }]}>
      <Text style={[styles.text, { color: closed ? colors.closedBadgeText : colors.draftBadgeText }]}>
        {closed ? 'Closed' : 'Draft'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontFamily: FONTS.semiBold },
});
