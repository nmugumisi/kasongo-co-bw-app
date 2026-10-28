import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCashiers, createCashier, updateCashier, deleteCashier } from '../services/api';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function CashiersScreen() {
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setCashiers(await getCashiers());
    } catch (e) {
      Alert.alert('Could not load cashiers', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAdd() {
    if (!name.trim() || !/^\d{4}$/.test(pin)) {
      Alert.alert('Check the details', 'Enter a name and a 4-digit passcode.');
      return;
    }
    setSubmitting(true);
    try {
      await createCashier({ name: name.trim(), pin });
      setName('');
      setPin('');
      await load();
    } catch (e) {
      Alert.alert('Could not add cashier', e.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleToggle(c) {
    Alert.alert(
      c.disabled ? `Enable ${c.name}?` : `Disable ${c.name}?`,
      c.disabled ? undefined : `${c.name} will be signed out everywhere and can't capture stock until re-enabled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: c.disabled ? 'Enable' : 'Disable',
          style: c.disabled ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await updateCashier(c.id, { disabled: !c.disabled });
              load();
            } catch (e) {
              Alert.alert('Could not update', e.message || 'Something went wrong.');
            }
          },
        },
      ]
    );
  }

  function handleRemove(c) {
    Alert.alert('Remove cashier?', `${c.name} has no stock history, so this can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCashier(c.id);
            load();
          } catch (e) {
            Alert.alert('Could not remove', e.message || 'Something went wrong.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Add a cashier</Text>
        <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <TextInput
          style={[styles.input, styles.inputSpacing]}
          placeholder="4-digit passcode"
          placeholderTextColor="#888"
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          onChangeText={setPin}
        />
        <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Adding…' : 'Add cashier'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cashiers}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No cashiers yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, item.disabled && styles.rowDisabled]}>
            <View style={styles.flex1}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.disabled ? 'Disabled' : 'Active'}
                {item.last ? ` · last in ${item.last}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleToggle(item)}>
              <Text style={styles.actionLink}>{item.disabled ? 'Enable' : 'Disable'}</Text>
            </TouchableOpacity>
            {item.can_remove ? (
              <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeLink}>
                <Text style={[styles.actionLink, styles.removeText]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  form: { backgroundColor: colors.card, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 16, fontFamily: FONTS.semiBold, color: colors.ink, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: colors.ink,
  },
  inputSpacing: { marginTop: 8 },
  button: { backgroundColor: colors.brand, borderRadius: 24, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
  list: { padding: 12 },
  empty: { textAlign: 'center', marginTop: 20, color: colors.subtleText, fontFamily: FONTS.regular },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  rowDisabled: { opacity: 0.6 },
  flex1: { flex: 1 },
  name: { fontSize: 15, fontFamily: FONTS.medium, color: colors.ink },
  meta: { fontSize: 12, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 2 },
  actionLink: { fontSize: 13, fontFamily: FONTS.medium, color: colors.brandDark },
  removeLink: { marginLeft: 14 },
  removeText: { color: colors.danger },
});
