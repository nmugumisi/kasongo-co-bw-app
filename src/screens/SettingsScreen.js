import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { IconBack, IconSun, IconMoon } from '../theme/zbsIcons';
import BarSettingsPanel from '../components/BarSettingsPanel';
import CashiersPanel from '../components/CashiersPanel';
import AccountPanel from '../components/AccountPanel';
import ItemsPanel from '../components/ItemsPanel';
import ReportsPanel from '../components/ReportsPanel';
import ActivityPanel from '../components/ActivityPanel';

const SUB = { bar: 'Bar profile', cashiers: 'Cashiers & managers', items: 'Stock items', reports: 'Variance report', activity: 'Activity log', account: 'Your account' };

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useZbsColors();
  const { canManage, theme, toggleTheme } = useAuth();
  const tabs = useMemo(
    // Manager/admin accounts themselves are managed in wp-admin, so there's no Account tab for them.
    () =>
      canManage
        ? [
            { key: 'bar', label: 'Bar' },
            { key: 'cashiers', label: 'Staff' },
            { key: 'items', label: 'Items' },
            { key: 'reports', label: 'Reports' },
            { key: 'activity', label: 'Activity' },
          ]
        : [],
    [canManage]
  );
  const route = useRoute();
  // Home's setup checklist opens a particular tab.
  const [tab, setTab] = useState(canManage ? route.params?.tab || 'bar' : 'account');
  const styles = makeStyles(c);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <IconBack size={20} color={c.text} />
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <Text style={styles.titleStrong}>Settings</Text>
          <Text style={styles.titleSmall}>{SUB[tab]}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={toggleTheme}
          accessibilityLabel={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <IconSun size={20} color={c.text} /> : <IconMoon size={20} color={c.text} />}
        </TouchableOpacity>
      </View>

      {tabs.length ? (
        <View style={styles.seg}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.segBtn, tab === t.key && { backgroundColor: c.accent }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.segBtnText, { color: tab === t.key ? c.accentInk : c.muted }]} numberOfLines={1} adjustsFontSizeToFit>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {tab === 'bar' ? (
        <BarSettingsPanel />
      ) : tab === 'cashiers' ? (
        <CashiersPanel />
      ) : tab === 'items' ? (
        <ItemsPanel />
      ) : tab === 'reports' ? (
        <ReportsPanel />
      ) : tab === 'activity' ? (
        <ActivityPanel />
      ) : (
        <AccountPanel />
      )}
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.bg },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
    iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    titleCol: { flex: 1, minWidth: 0 },
    titleStrong: { fontSize: 18, fontWeight: '700', color: c.text },
    titleSmall: { fontSize: 13, color: c.muted, marginTop: 1 },
    seg: { flexDirection: 'row', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 3, marginHorizontal: 14, marginTop: 4, marginBottom: 10 },
    segBtn: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    segBtnText: { fontSize: 14, fontWeight: '600' },
  });
}
