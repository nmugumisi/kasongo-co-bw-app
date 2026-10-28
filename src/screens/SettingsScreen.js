import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../utils/AuthContext';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, canManage, settings, logOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Signed in as {user?.name}</Text>
        <Text style={styles.rowSub}>{canManage ? 'Manager' : 'Cashier'} · {settings.bar_name}</Text>
      </View>

      {canManage ? (
        <>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('BarSettings')}>
            <Text style={styles.linkText}>Bar settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Cashiers')}>
            <Text style={styles.linkText}>Cashiers</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('About')}>
        <Text style={styles.linkText}>About Kasongo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logOut}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: colors.ink, marginBottom: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 20 },
  row: { fontSize: 15, fontFamily: FONTS.medium, color: colors.ink },
  rowSub: { fontSize: 13, fontFamily: FONTS.regular, color: colors.subtleText, marginTop: 4 },
  link: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  linkText: { fontSize: 15, fontFamily: FONTS.medium, color: colors.ink },
  logoutButton: {
    marginTop: 16,
    backgroundColor: colors.danger,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontFamily: FONTS.semiBold, fontSize: 16 },
});
