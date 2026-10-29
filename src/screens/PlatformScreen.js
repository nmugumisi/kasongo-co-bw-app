import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlatformBars, decideBar, getSupportView } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { IconUser, IconOut, IconClose, IconEye, IconBack } from '../theme/zbsIcons';
import { makeStyles as sheetStyles } from '../components/ManagersSection';

const STATUS = { pending: 'Pending', active: 'Active', declined: 'Declined' };

/**
 * Verifiers (platform staff): bars waiting for approval and every bar on the platform. A Verifier
 * sees who signed up and how far along each bar is; a bar's own sheets, items and staff only through
 * "View as", which the bar sees in its activity log.
 */
export default function PlatformScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useZbsColors();
  const { user, logOut, startView } = useAuth();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState(null);
  const [live, setLive] = useState(null); // a support view still running (opened earlier, or on the web)
  const [openId, setOpenId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const styles = makeStyles(c);

  const load = useCallback(async (which) => {
    try {
      const list = await getPlatformBars(which === 'pending' ? 'pending' : undefined);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows((r) => r ?? []);
      Alert.alert('Could not load bars', e.message || 'Something went wrong.');
    }
    getSupportView()
      .then((v) => setLive(v?.bar ? v : null))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [load, tab])
  );

  function pickTab(t) {
    if (t === tab) return;
    setRows(null);
    setTab(t);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  }

  const open = openId ? rows?.find((b) => b.id === openId) : null;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        {navigation.canGoBack() ? (
          // An admin who also works at a bar came here from Home.
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <IconBack size={20} color={c.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleCol}>
          <Text style={styles.titleStrong}>Bars</Text>
          <Text style={styles.titleSmall} numberOfLines={1}>
            {tab === 'pending' ? 'Waiting for approval' : 'Every bar on the platform'} · {user?.name}
          </Text>
        </View>
        {navigation.canGoBack() ? null : (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings">
              <IconUser size={20} color={c.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutBtn} onPress={logOut}>
              <IconOut size={18} color={c.text} />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.seg}>
        {[
          ['pending', 'Pending'],
          ['all', 'All bars'],
        ].map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.segBtn, tab === k && { backgroundColor: c.accent }]} onPress={() => pickTab(k)}>
            <Text style={[styles.segBtnText, { color: tab === k ? c.accentInk : c.muted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.main, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {live ? <LiveView view={live} onEnded={() => setLive(null)} /> : null}
        {!rows ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} />
        ) : !rows.length ? (
          <Text style={styles.empty}>
            {tab === 'pending' ? "Nobody waiting. New sign-ups appear here, and you're emailed about each one." : 'No bars yet.'}
          </Text>
        ) : (
          <View style={styles.list}>
            {rows.map((b) => {
              const who = b.owners?.[0]?.name;
              return (
                <TouchableOpacity key={b.id} style={styles.row} onPress={() => setOpenId(b.id)}>
                  <View style={[styles.avatar, { backgroundColor: `${c.accent}38` }]}>
                    <Text style={styles.avatarText}>{(b.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      @{b.slug}
                      {who ? ` · ${who}` : ''} · {b.status === 'pending' ? `signed up ${b.created}` : `${b.items} items, ${b.sheets} sheets`}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: b.status === 'active' ? c.posBg : b.status === 'declined' ? c.negBg : c.warnBg }]}>
                    <Text style={[styles.pillText, { color: b.status === 'active' ? c.pos : b.status === 'declined' ? c.neg : c.warn }]}>{STATUS[b.status] || b.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <Text style={styles.hint}>
          You see who signed up and how far along each bar is. Its sheets, items and staff only through View as, which the bar sees in its activity log.
          Decisions are emailed to the owners and logged there too.
        </Text>
      </ScrollView>

      <BarModal
        bar={open}
        onClose={() => setOpenId(null)}
        onDecided={(msg) => {
          setOpenId(null);
          load(tab);
          Alert.alert('Done', msg);
        }}
        onView={startView}
      />
    </View>
  );
}

/** A support view still running: carry on, or end it. */
function LiveView({ view, onEnded }) {
  const c = useZbsColors();
  const { startView, endView } = useAuth();
  const styles = makeStyles(c);
  const [busy, setBusy] = useState(false);

  async function carryOn() {
    setBusy(true);
    try {
      await startView(view.bar, view.reason); // a fresh hour, logged again
    } catch (e) {
      setBusy(false);
      Alert.alert('Could not open it', e.message || 'Something went wrong.');
    }
  }

  return (
    <View style={[styles.liveCard, { borderColor: c.view }]}>
      <IconEye size={20} color={c.view} />
      <View style={styles.flex1}>
        <Text style={styles.rowName}>You're viewing {view.name}</Text>
        <Text style={styles.rowMeta}>Read-only support view</Text>
      </View>
      <TouchableOpacity style={styles.smallBtn} onPress={carryOn} disabled={busy}>
        <Text style={styles.smallBtnText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.smallBtn}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await endView();
          onEnded();
        }}
      >
        <Text style={styles.smallBtnText}>End</Text>
      </TouchableOpacity>
    </View>
  );
}

function BarModal({ bar, onClose, onDecided, onView }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(24);
  const isOnline = useNetworkStatus();
  const s = { ...sheetStyles(c), ...makeStyles(c) };
  const [declineWhy, setDeclineWhy] = useState('');
  const [viewWhy, setViewWhy] = useState('');
  const [busy, setBusy] = useState(null); // 'approve' | 'decline' | 'view'
  const [error, setError] = useState(null);
  const [viewError, setViewError] = useState(null);

  useEffect(() => {
    setDeclineWhy('');
    setViewWhy('');
    setBusy(null);
    setError(null);
    setViewError(null);
  }, [bar?.id]);

  if (!bar) return null;

  async function decide(approve) {
    if (!isOnline) return setError("You're offline.");
    if (!approve && !declineWhy.trim()) return setError("Say why. It's emailed to the owner.");
    setBusy(approve ? 'approve' : 'decline');
    setError(null);
    try {
      const b = await decideBar(bar.id, approve, declineWhy.trim());
      onDecided(`${b.name} ${approve ? 'approved' : 'declined'}. The owner has been emailed.`);
    } catch (e) {
      setBusy(null);
      setError(e.message || 'Something went wrong.');
    }
  }

  async function view() {
    if (!isOnline) return setViewError("You're offline.");
    if (viewWhy.trim().length < 5) return setViewError('Say why you need to look. The bar sees it in its activity log.');
    setBusy('view');
    setViewError(null);
    try {
      await onView(bar.id, viewWhy.trim()); // the app switches to the bar, read-only
    } catch (e) {
      setBusy(null);
      setViewError(e.message || 'Something went wrong.');
    }
  }

  const stat = (label, v) => (
    <View style={s.kpi} key={label}>
      <Text style={s.kpiLbl}>{label}</Text>
      <Text style={s.kpiVal}>{v}</Text>
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={busy ? undefined : onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, s.tall, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={s.grab} />
          <View style={s.head}>
            <View style={s.flex1}>
              <Text style={s.title} numberOfLines={1}>
                {bar.name}
              </Text>
              <Text style={s.detailMuted} numberOfLines={1}>
                @{bar.slug} · {STATUS[bar.status] || bar.status} · signed up {bar.created}
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.sectionH}>Owner</Text>
            {(bar.owners || []).map((o) => (
              <View key={o.email} style={s.ownerRow}>
                <View style={s.flex1}>
                  <Text style={s.rowName}>{o.name}</Text>
                  <Text style={s.rowMeta}>{o.email}</Text>
                </View>
                <Text style={s.rowMeta}>{o.verified ? 'email confirmed' : 'email not confirmed'}</Text>
              </View>
            ))}

            <Text style={[s.sectionH, { marginTop: 16 }]}>Set up so far</Text>
            <View style={s.kpis}>{[stat('Items', bar.items), stat('Managers', bar.managers), stat('Cashiers', bar.cashiers), stat('Sheets', bar.sheets)]}</View>
            {bar.last || bar.ai_month ? (
              <Text style={s.hint}>
                {bar.last ? `Last sheet ${bar.last}. ` : ''}
                {bar.ai_month ? `AI this month: $${Number(bar.ai_month).toFixed(2)}.` : ''}
              </Text>
            ) : null}
            {bar.status === 'declined' && bar.note ? (
              <Text style={s.hint}>
                Declined: {bar.note}
                {bar.deletes ? ` Deleted on ${bar.deletes}.` : ''}
              </Text>
            ) : null}

            {bar.status === 'pending' ? (
              <View style={s.panelActions}>
                <TouchableOpacity style={[s.saveBtn, { backgroundColor: c.accent, marginTop: 0 }]} onPress={() => decide(true)} disabled={!!busy}>
                  <Text style={[s.saveBtnText, { color: c.accentInk }]}>{busy === 'approve' ? 'Approving…' : 'Approve'}</Text>
                </TouchableOpacity>
                <Text style={[s.fieldLabel, { marginTop: 10 }]}>Or decline, saying why</Text>
                <TextInput
                  style={[s.input, s.multi]}
                  value={declineWhy}
                  onChangeText={setDeclineWhy}
                  maxLength={255}
                  multiline
                  placeholder="Emailed to the owner"
                  placeholderTextColor={c.muted}
                />
                {error ? <Text style={s.error}>{error}</Text> : null}
                <TouchableOpacity style={[s.panelBtn, s.dangerBtn]} onPress={() => decide(false)} disabled={!!busy}>
                  <Text style={[s.panelBtnText, { color: c.neg }]}>{busy === 'decline' ? 'Declining…' : 'Decline'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[s.sectionH, { marginTop: 22 }]}>Support</Text>
            <Text style={s.fieldLabel}>View as manager, read-only, for up to an hour</Text>
            <TextInput
              style={[s.input, s.multi]}
              value={viewWhy}
              onChangeText={setViewWhy}
              maxLength={300}
              multiline
              placeholder="Why? e.g. Owner says Friday's count looks wrong"
              placeholderTextColor={c.muted}
            />
            {viewError ? <Text style={s.error}>{viewError}</Text> : null}
            <TouchableOpacity style={[s.panelBtn, s.viewBtn, { borderColor: c.view }]} onPress={view} disabled={!!busy}>
              {busy === 'view' ? <ActivityIndicator color={c.view} /> : <IconEye size={18} color={c.view} />}
              <Text style={[s.panelBtnText, { color: c.text }]}>View as manager</Text>
            </TouchableOpacity>
            <Text style={s.hint}>The reason is shown in the bar's activity log. Nothing can be changed, downloaded or asked of the AI while you look.</Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.bg },
    flex1: { flex: 1, minWidth: 0 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
    titleCol: { flex: 1, minWidth: 0 },
    titleStrong: { fontSize: 18, fontWeight: '700', color: c.text },
    titleSmall: { fontSize: 13, color: c.muted, marginTop: 1 },
    iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    signOutText: { fontSize: 14, fontWeight: '600', color: c.text },
    seg: { flexDirection: 'row', backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 3, marginHorizontal: 14, marginTop: 4, marginBottom: 10 },
    segBtn: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    segBtnText: { fontSize: 14, fontWeight: '600' },
    main: { padding: 14, paddingTop: 4 },
    empty: { color: c.muted, textAlign: 'center', paddingVertical: 30, lineHeight: 20 },
    list: { gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontWeight: '800', fontSize: 15, color: c.text },
    rowName: { fontSize: 15, fontWeight: '700', color: c.text },
    rowMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
    pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    pillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    hint: { fontSize: 12, color: c.muted, marginTop: 14, lineHeight: 17 },
    liveCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1.5, marginBottom: 12 },
    smallBtn: { height: 36, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg2, borderWidth: 1, borderColor: c.line },
    smallBtnText: { fontSize: 13, fontWeight: '700', color: c.text },
    tall: { maxHeight: '90%' },
    sectionH: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.muted, marginBottom: 8 },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    kpi: { flexBasis: '47%', flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
    kpiLbl: { fontSize: 11, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    kpiVal: { fontSize: 20, fontWeight: '800', color: c.text, marginTop: 2 },
    multi: { height: 72, paddingTop: 12, textAlignVertical: 'top' },
    viewBtn: { flexDirection: 'row', gap: 8, marginTop: 12 },
  });
}
