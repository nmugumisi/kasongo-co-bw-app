import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useZbsColors } from '../theme/zbsColors';

// Only **bold** and "- " bullets are formatted (same as the Crop app's answers); everything else is plain text.
function bold(text, key, style) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, i) =>
    /^\*\*.+\*\*$/.test(part) ? (
      <Text key={`${key}-${i}`} style={style}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    )
  );
}

export default function AiText({ text, color }) {
  const c = useZbsColors();
  const ink = color || c.text;
  const lines = String(text || '').split(/\r?\n/);
  return (
    <View>
      {lines.map((ln, i) => {
        if (!ln.trim()) return null;
        const m = ln.match(/^\s*[-*•]\s+(.*)$/);
        if (m) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.text, { color: c.accent }]}>•</Text>
              <Text style={[styles.text, styles.bulletText, { color: ink }]}>{bold(m[1], i, styles.bold)}</Text>
            </View>
          );
        }
        const check = /^\s*check:/i.test(ln);
        return (
          <Text key={i} style={[styles.text, styles.para, { color: ink }, check && styles.bold]}>
            {bold(ln, i, styles.bold)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 14.5, lineHeight: 21 },
  para: { marginBottom: 6 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletText: { flex: 1, marginLeft: 8 },
  bold: { fontWeight: '700' },
});
