import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONTS } from '../theme/typography';

const AUTO_DISMISS_MS = 4000;

export default function OfflineBanner({ visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You are offline. Changes will fail until you reconnect.</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.close}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: { color: '#fff', fontFamily: FONTS.regular, fontSize: 13, flex: 1, marginRight: 12 },
  close: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 14 },
});
