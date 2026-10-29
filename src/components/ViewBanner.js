import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { IconEye } from '../theme/zbsIcons';

function minsLeft(endsAt) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 60000));
}

/** Across the top of every screen while a Verifier views a bar as support: what, how long, and End. */
export default function ViewBanner({ top }) {
  const c = useZbsColors();
  const { viewAs, endView } = useAuth();
  const [left, setLeft] = useState(() => minsLeft(viewAs.endsAt));
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const m = minsLeft(viewAs.endsAt);
      setLeft(m);
      if (m <= 0) {
        clearInterval(id);
        endView();
        Alert.alert('Support view ended', 'It ends on its own after an hour. Open it again from the Bars screen if you need more time.');
      }
    }, 15000);
    return () => clearInterval(id);
  }, [viewAs.endsAt, endView]);

  return (
    <View style={[styles.bar, { backgroundColor: c.viewBar, paddingTop: top + 8 }]} accessibilityRole="summary">
      <IconEye size={20} color="#fff" />
      <View style={styles.flex1}>
        <Text style={styles.title} numberOfLines={1}>
          Support view: {viewAs.name}
        </Text>
        <Text style={styles.sub}>Read-only · {left} min left</Text>
      </View>
      <TouchableOpacity
        style={styles.btn}
        disabled={ending}
        onPress={async () => {
          setEnding(true);
          await endView();
        }}
      >
        <Text style={styles.btnText}>{ending ? 'Ending…' : 'End'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  flex1: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 },
  btn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
