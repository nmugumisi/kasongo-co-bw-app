import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSheets, createSheet } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { IconCog, IconMoon, IconSun, IconOut, IconNext } from '../theme/zbsIcons';
import { niceDate, people, signed, money } from '../utils/format';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useZbsColors();
  const { user, settings, theme, toggleTheme, logOut } = useAuth();
  const today = todayIso();

  const [sheets, setSheets] = useState(null);
  const [date, setDate] = useState(today);
  const [showPicker, setShowPicker] = useState(false);
  const [opening, setOpening] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getSheets({ limit: 20 });
      setSheets(Array.isArray(list) ? list : []);
    } catch {
      setSheets((s) => s ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function openSheetFor(dateStr) {
    setOpening(true);
    try {
      const d = await createSheet({ date: dateStr });
      navigation.navigate('Sheet', { sheetId: d.sheet.id });
    } catch {
      // toast-free: errors surface once on the sheet screen reload
    } finally {
      setOpening(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await logOut();
  }

  const todaySheet = (sheets || []).find((s) => s.date === today);
  const styles = makeStyles(c);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={styles.titleStrong} numberOfLines={1}>
            {settings.bar_name}
          </Text>
          <Text style={styles.titleSmall} numberOfLines={1}>
            {user?.name}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
          <IconCog size={20} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleTheme}>
          {theme === 'dark' ? <IconSun size={20} color={c.text} /> : <IconMoon size={20} color={c.text} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
          <IconOut size={18} color={c.text} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: insets.bottom + 24 }]}>
        {todaySheet ? (
          <TouchableOpacity onPress={() => navigation.navigate('Sheet', { sheetId: todaySheet.id })} activeOpacity={0.9}>
            <LinearGradient colors={[c.accent, '#ff8a3d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <Text style={styles.heroEyebrow}>Today's sheet · {todaySheet.status === 'closed' ? 'closed' : 'open'}</Text>
              <Text style={styles.heroTitle}>{niceDate(todaySheet.date, true)}</Text>
              <Text style={styles.heroSub}>
                {people(todaySheet.contributors, todaySheet.cashier)} · tap to {todaySheet.status === 'closed' ? 'view or correct' : 'join'}
              </Text>
              <View style={styles.heroGo}>
                <IconNext size={18} color={c.accentInk} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : sheets ? (
          <TouchableOpacity onPress={() => openSheetFor(today)} activeOpacity={0.9} disabled={opening}>
            <LinearGradient colors={[c.accent, '#ff8a3d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <Text style={styles.heroEyebrow}>No sheet yet today</Text>
              <Text style={styles.heroTitle}>{opening ? 'Opening…' : "Start today's sheet"}</Text>
              <Text style={styles.heroSub}>Everyone on shift works on the same sheet</Text>
              <View style={styles.heroGo}>
                <IconNext size={18} color={c.accentInk} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateInputText}>{date}</Text>
          </TouchableOpacity>
          {showPicker ? (
            <DateTimePicker
              value={new Date(date + 'T12:00:00')}
              mode="date"
              maximumDate={new Date(today + 'T12:00:00')}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(ev, picked) => {
                setShowPicker(Platform.OS === 'ios');
                if (picked) {
                  const iso = `${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`;
                  setDate(iso);
                }
              }}
            />
          ) : null}
          <TouchableOpacity style={styles.openBtn} onPress={() => openSheetFor(date)} disabled={opening}>
            <Text style={styles.openBtnText}>{opening ? 'Opening…' : 'Open sheet'}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Opens the sheet for that date, or starts it if nobody has yet.</Text>
        </View>

        <Text style={styles.sectionH}>Recent sheets</Text>
        {!sheets ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 20 }} />
        ) : !sheets.length ? (
          <Text style={styles.empty}>No sheets yet. Start one above.</Text>
        ) : (
          <View style={styles.sheetList}>
            {sheets.map((s) => {
              const v = settings.show_values ? s.variance_value : s.variance;
              const valText = v ? (settings.show_values ? money(v, settings.currency) : signed(v)) : '-';
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.sheetRow}
                  onPress={() => navigation.navigate('Sheet', { sheetId: s.id })}
                >
                  <View style={styles.flex1}>
                    <Text style={styles.sheetDate}>{niceDate(s.date)}</Text>
                    <Text style={styles.sheetMeta}>
                      {people(s.contributors, s.cashier)}
                      {s.edits ? ` · ${s.edits} edit${s.edits === 1 ? '' : 's'}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.pill, s.status === 'closed' ? styles.pillClosed : styles.pillDraft]}>
                    <Text style={[styles.pillText, s.status === 'closed' ? styles.pillTextClosed : styles.pillTextDraft]}>
                      {s.status === 'closed' ? 'Closed' : 'Draft'}
                    </Text>
                  </View>
                  <Text style={[styles.sheetVal, v < 0 ? styles.neg : v > 0 ? styles.pos : null]}>{valText}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.bg },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
    titleCol: { flex: 1, minWidth: 0 },
    titleStrong: { fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: -0.2 },
    titleSmall: { fontSize: 13, color: c.muted, marginTop: 1 },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 42,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.line,
    },
    signOutText: { fontSize: 14, fontWeight: '600', color: c.text },
    main: { padding: 14 },
    hero: {
      borderRadius: 16,
      padding: 18,
      paddingRight: 60,
      marginBottom: 14,
      gap: 4,
    },
    heroEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, color: c.accentInk, opacity: 0.7 },
    heroTitle: { fontSize: 20, fontWeight: '700', color: c.accentInk, letterSpacing: -0.2 },
    heroSub: { fontSize: 14, color: c.accentInk, opacity: 0.85 },
    heroGo: {
      position: 'absolute',
      right: 16,
      top: '50%',
      marginTop: -18,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 16, marginBottom: 10 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: c.muted, marginBottom: 6 },
    dateInput: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.bg2, justifyContent: 'center', paddingHorizontal: 12 },
    dateInputText: { fontSize: 16, color: c.text },
    openBtn: { height: 50, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    openBtnText: { fontSize: 16, fontWeight: '700', color: c.text },
    hint: { fontSize: 12, color: c.muted, marginTop: 8, textAlign: 'center' },
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginTop: 22, marginBottom: 10, marginHorizontal: 2 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 24 },
    sheetList: { gap: 8 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    flex1: { flex: 1, minWidth: 0 },
    sheetDate: { fontSize: 15, fontWeight: '700', color: c.text },
    sheetMeta: { fontSize: 13, color: c.muted, marginTop: 2 },
    pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    pillDraft: { backgroundColor: c.warnBg },
    pillClosed: { backgroundColor: c.posBg },
    pillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    pillTextDraft: { color: c.warn },
    pillTextClosed: { color: c.pos },
    sheetVal: { fontWeight: '700', minWidth: 60, textAlign: 'right', color: c.muted },
    neg: { color: c.neg },
    pos: { color: c.pos },
  });
}
