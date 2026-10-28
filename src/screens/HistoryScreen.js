import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getSheets } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';
import { formatQty, formatMoney } from '../utils/format';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { settings } = useAuth();
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    try {
      const data = await getSheets({ limit: 40 });
      setSheets(Array.isArray(data) ? data : []);
    } catch {
      // keep whatever was already shown
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load({ background: sheets.length > 0 });
    }, [load, sheets.length])
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.brand} />
      ) : (
        <FlatList
          data={sheets}
          keyExtractor={(item) => String(item.id)}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load({ background: true });
            setRefreshing(false);
          }}
          ListEmptyComponent={<Text style={styles.empty}>No sheets yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('SheetDetail', { sheetId: item.id })}>
              <View style={styles.flex1}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.meta}>
                  {item.contributors?.length ? item.contributors.join(', ') : item.cashier}
                  {item.edits ? ` · ${item.edits} edit${item.edits === 1 ? '' : 's'}` : ''}
                </Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.variance, item.variance < 0 && styles.varianceShort]}>
                  {formatQty(item.variance)}
                </Text>
                {settings.show_values ? (
                  <Text style={styles.value}>{formatMoney(item.variance_value, settings.currency)}</Text>
                ) : null}
                <StatusBadge status={item.status} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.subtleText, fontFamily: FONTS.regular },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flex1: { flex: 1 },
  date: { fontSize: 15, fontFamily: FONTS.semiBold, color: colors.ink },
  meta: { fontSize: 12, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  variance: { fontSize: 14, fontFamily: FONTS.semiBold, color: colors.ink },
  varianceShort: { color: colors.danger },
  value: { fontSize: 11, fontFamily: FONTS.regular, color: colors.subtleText },
});
