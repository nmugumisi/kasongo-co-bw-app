import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, Switch, Platform, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';
import { getDevices, setDevicesRequired, renameDevice, unlinkDevice, newLinkSession, getLinkSession, cancelLinkSession } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { useZbsColors } from '../theme/zbsColors';
import { useBottomCushion } from '../theme/layout';
import { IconClose, IconPhone, IconGlobe } from '../theme/zbsIcons';
import { makeStyles } from './ManagersSection';

/** Phones and browsers linked to this bar, on Settings › Staff. Linking uses a one-time code or a QR from here. */
export default function DevicesSection() {
  const c = useZbsColors();
  const { settings, readOnly } = useAuth();
  const live = !settings.bar_status || settings.bar_status === 'active';
  const [data, setData] = useState(null); // { devices, required }
  const [panelId, setPanelId] = useState(undefined); // undefined=closed, number=details
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const styles = { ...makeStyles(c), ...local(c) };

  const load = useCallback(async () => {
    try {
      setData(await getDevices());
    } catch {
      setData((d) => d ?? { devices: [], required: false });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleRequired(on) {
    const go = async () => {
      setSaving(true);
      try {
        setData(await setDevicesRequired(on));
      } catch (e) {
        Alert.alert('Could not change it', e.message || 'Something went wrong.');
      } finally {
        setSaving(false);
      }
    };
    if (on && !data.devices.length) {
      Alert.alert('No devices are linked yet', "Turn this on and cashiers can't sign in anywhere until you link one.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn on', onPress: go },
      ]);
    } else go();
  }

  const open = panelId ? data?.devices.find((d) => d.id === panelId) : null;

  return (
    <View>
      <Text style={[styles.sectionH, { marginTop: 30 }]}>Devices{data ? ` · ${data.devices.length}` : ''}</Text>
      {readOnly ? null : (
        <TouchableOpacity style={[styles.inviteBtn, !live && { opacity: 0.5 }]} onPress={() => setLinking(true)} disabled={!live}>
          <Text style={styles.inviteBtnText}>+ Link a device</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.hint}>
        {live
          ? 'Cashiers sign in with their passcode on a linked phone, tablet or browser. Linking takes a one-time code or QR from here.'
          : 'You can link devices once your bar is approved.'}
      </Text>

      {data ? (
        <View style={styles.reqRow}>
          <Switch
            value={!!data.required}
            onValueChange={toggleRequired}
            disabled={saving || readOnly}
            trackColor={{ true: c.accent, false: c.card2 }}
            thumbColor={Platform.OS === 'android' ? (data.required ? c.accentInk : c.muted) : undefined}
          />
          <Text style={styles.reqText}>Passcodes only on linked devices</Text>
        </View>
      ) : null}
      {data && !data.required ? (
        <Text style={styles.hint}>Off: any browser or phone with the app can take your cashiers' passcodes. Turn it on once your tills are linked.</Text>
      ) : null}

      {!data ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 14 }} />
      ) : !data.devices.length ? (
        <Text style={styles.empty}>No devices linked yet.</Text>
      ) : (
        <View style={[styles.list, { marginTop: 12 }]}>
          {data.devices.map((d) => (
            <TouchableOpacity key={d.id} style={styles.row} onPress={() => setPanelId(d.id)}>
              <View style={[styles.avatar, { backgroundColor: `${c.accent}38` }]}>
                {d.platform === 'web' ? <IconGlobe size={18} color={c.text} /> : <IconPhone size={18} color={c.text} />}
              </View>
              <View style={styles.flex1}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {d.last_used ? `Last used ${d.last_used}` : 'Not used yet'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <DeviceModal visible={panelId !== undefined && !!open} device={open} onClose={() => setPanelId(undefined)} onChanged={load} />
      <LinkModal visible={linking} onClose={() => setLinking(false)} onLinked={load} />
    </View>
  );
}

function DeviceModal({ visible, device, onClose, onChanged }) {
  const c = useZbsColors();
  const { readOnly } = useAuth();
  const cushion = useBottomCushion(24);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const styles = makeStyles(c);

  useEffect(() => {
    if (visible && device) {
      setName(device.name);
      setError(null);
    }
  }, [visible, device?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !device) return null;

  async function handleRename() {
    if (!name.trim()) return setError('Give it a name.');
    setBusy(true);
    setError(null);
    try {
      await renameDevice(device.id, name.trim());
      await onChanged();
      onClose();
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function handleUnlink() {
    Alert.alert(`Unlink ${device.name}?`, 'Whoever is signed in on it is signed out. It needs a new code to link again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink',
        style: 'destructive',
        onPress: async () => {
          try {
            await unlinkDevice(device.id);
            await onChanged();
            onClose();
          } catch (e) {
            Alert.alert('Could not unlink', e.message || 'Something went wrong.');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {device.name}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.detailMuted}>
            Linked {device.linked}
            {device.linked_by ? ` with a ${device.method === 'qr' ? 'QR code' : 'code'} from ${device.linked_by}` : ''}
            {device.last_used ? ` · last used ${device.last_used}` : ''}
          </Text>
          {readOnly ? null : (
          <>
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} placeholderTextColor={c.muted} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent }]} onPress={handleRename} disabled={busy}>
            <Text style={[styles.saveBtnText, { color: c.accentInk }]}>{busy ? 'Saving…' : 'Save name'}</Text>
          </TouchableOpacity>
          <View style={styles.panelActions}>
            <TouchableOpacity style={[styles.panelBtn, styles.dangerBtn]} onPress={handleUnlink} disabled={busy}>
              <Text style={[styles.panelBtnText, { color: c.neg }]}>Unlink</Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/** The QR as SVG: one path of dark modules on white, with a quiet zone. */
function QrCode({ value, size }) {
  if (!value) return null;
  const q = qrcode(0, 'M');
  q.addData(value);
  q.make();
  const n = q.getModuleCount();
  const m = 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) d += `M${col + m} ${r + m}h1v1h-1z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n + 2 * m} ${n + 2 * m}`}>
      <Rect width="100%" height="100%" fill="#fff" />
      <Path d={d} fill="#000" />
    </Svg>
  );
}

function mmss(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** Link a device: the code (shown once) and a QR that changes every 30 seconds, polled until it's used. */
function LinkModal({ visible, onClose, onLinked }) {
  const c = useZbsColors();
  const cushion = useBottomCushion(24);
  const styles = { ...makeStyles(c), ...local(c) };
  const [s, setS] = useState(null); // { id, code, qr, left, used, dead }
  const [error, setError] = useState(null);
  const ref = useRef(null);

  const start = useCallback(async () => {
    setS(null);
    setError(null);
    try {
      const r = await newLinkSession();
      ref.current = { id: r.id, used: false, dead: false };
      setS({ id: r.id, code: r.code, qr: r.qr, left: r.expires_in, used: null, dead: false });
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    start();
    return () => {
      // Closed before it was used: cancel it so the code can't be used later.
      const cur = ref.current;
      if (cur && !cur.used && !cur.dead) cancelLinkSession(cur.id).catch(() => {});
      ref.current = null;
    };
  }, [visible, start]);

  // Count down every second; ask the server every 3 for a fresh QR and whether it's been used.
  useEffect(() => {
    if (!s || s.used || s.dead) return undefined;
    let tick = 0;
    const id = setInterval(async () => {
      tick += 1;
      setS((p) => (p && !p.used && !p.dead ? { ...p, left: p.left - 1, dead: p.left - 1 <= 0 } : p));
      if (tick % 3) return;
      try {
        const r = await getLinkSession(s.id);
        if (!ref.current || ref.current.id !== s.id) return;
        if (r.used) {
          ref.current.used = true;
          onLinked();
        }
        if (r.cancelled) ref.current.dead = true;
        setS((p) => (p && p.id === r.id ? { ...p, qr: r.qr || p.qr, left: r.expires_in, used: r.used || null, dead: !!r.cancelled || r.expires_in <= 0 } : p));
      } catch {
        // keep showing the current QR; the next poll tries again
      }
    }, 1000);
    return () => clearInterval(id);
  }, [s?.id, s?.used, s?.dead]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: cushion }]} onPress={() => {}}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <Text style={styles.title}>Link a device</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <IconClose size={18} color={c.text} />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !s ? (
            <ActivityIndicator color={c.accent} style={{ marginVertical: 40 }} />
          ) : s.used ? (
            <View style={styles.done}>
              <View style={[styles.tick, { backgroundColor: c.pos }]}>
                <Text style={styles.tickMark}>✓</Text>
              </View>
              <Text style={styles.doneTitle}>{s.used.name} is linked</Text>
              <Text style={[styles.hint, { textAlign: 'center' }]}>Cashiers can sign in on it with their passcodes. Rename or unlink it under Devices.</Text>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent, alignSelf: 'stretch' }]} onPress={onClose}>
                <Text style={[styles.saveBtnText, { color: c.accentInk }]}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.panelBtn, { alignSelf: 'stretch', marginTop: 8 }]} onPress={start}>
                <Text style={styles.panelBtnText}>Link another</Text>
              </TouchableOpacity>
            </View>
          ) : s.dead ? (
            <View style={styles.done}>
              <Text style={styles.empty}>This code has expired.</Text>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.accent, alignSelf: 'stretch' }]} onPress={start}>
                <Text style={[styles.saveBtnText, { color: c.accentInk }]}>New code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <View style={styles.qrBox}>
                <QrCode value={s.qr} size={216} />
              </View>
              <Text style={[styles.hint, { textAlign: 'center' }]}>
                On the new phone, open Kasongo and tap <Text style={{ fontWeight: '700' }}>Link this phone</Text>, then scan. On a browser, type the code instead.
              </Text>
              <Text selectable style={[styles.code, { color: c.text, borderColor: c.line }]}>
                {s.code}
              </Text>
              <Text style={styles.hint}>Works once · expires in {mmss(s.left)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function local(c) {
  return StyleSheet.create({
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
    reqText: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },
    qrBox: { backgroundColor: '#fff', borderRadius: 14, padding: 8, marginVertical: 6 },
    code: {
      alignSelf: 'stretch',
      textAlign: 'center',
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 4,
      paddingVertical: 12,
      marginTop: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 12,
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    },
    done: { alignItems: 'center', paddingVertical: 12 },
    tick: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    tickMark: { color: '#fff', fontSize: 28, fontWeight: '800' },
    doneTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  });
}
