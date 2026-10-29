import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { linkDevice } from '../services/api';
import { DARK } from '../theme/zbsColors';

const c = DARK;

// Same alphabet as the server: no 0/O, 1/I/L look-alikes. Shown as XXXX-XXXX.
function formatCode(v) {
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

/**
 * Link this phone to a bar: scan the QR on a manager's screen, or type the code under it.
 * The server answers with a device token (kept in SecureStore by the caller); passcodes typed on
 * this phone are then only looked up in that bar.
 */
export default function DeviceLinkFlow({ onLinked, onCancel, note }) {
  const [mode, setMode] = useState('code'); // code | scan
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(note || null);
  const [perm, requestPerm] = useCameraPermissions();
  const scanned = useRef(false);

  async function link(body) {
    setBusy(true);
    setError(null);
    try {
      const r = await linkDevice({ ...body, name: name.trim(), platform: Platform.OS });
      await onLinked(r);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      setBusy(false);
      scanned.current = false;
      if (body.qr) setMode('code');
    }
  }

  async function openScanner() {
    setError(null);
    scanned.current = false;
    if (!perm?.granted) {
      const p = await requestPerm();
      if (!p.granted) {
        setError('Camera access is off. Type the code instead, or allow the camera in your phone settings.');
        return;
      }
    }
    setMode('scan');
  }

  function onScan({ data }) {
    if (scanned.current || busy) return;
    if (!/^KSG1:/.test(String(data))) return; // someone else's QR in view: keep looking
    scanned.current = true;
    link({ qr: String(data) });
  }

  if (mode === 'scan') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Scan the QR</Text>
        <Text style={styles.sub}>On the manager's phone or computer: Settings › Staff › Link a device.</Text>
        <View style={styles.camera}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={busy ? undefined : onScan} />
          <View style={styles.frame} pointerEvents="none" />
          {busy ? (
            <View style={styles.cameraBusy}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.cameraBusyText}>Linking…</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => setMode('code')} style={styles.link} disabled={busy}>
          <Text style={styles.linkText}>Type the code instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ready = code.replace('-', '').length === 8;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Link this phone</Text>
      <Text style={styles.sub}>Ask a manager for a link code. They'll find it in Settings › Staff › Link a device.</Text>
      <TouchableOpacity style={styles.scanBtn} onPress={openScanner} disabled={busy}>
        <Text style={styles.scanBtnText}>Scan QR code</Text>
      </TouchableOpacity>
      <Text style={styles.or}>or type the code</Text>
      <TextInput
        style={[styles.input, styles.code]}
        value={code}
        onChangeText={(v) => setCode(formatCode(v))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={9}
        placeholder="XXXX-XXXX"
        placeholderTextColor={c.muted}
      />
      <Text style={styles.label}>Name this phone (optional)</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} placeholder="e.g. Bar till" placeholderTextColor={c.muted} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.button, !ready && styles.disabled]} onPress={() => link({ code })} disabled={busy || !ready}>
        {busy ? <ActivityIndicator color={c.accentInk} /> : <Text style={styles.buttonText}>Link</Text>}
      </TouchableOpacity>
      {onCancel ? (
        <TouchableOpacity onPress={onCancel} style={styles.link}>
          <Text style={styles.linkText}>Cancel</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 360 },
  title: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 14, color: c.muted, lineHeight: 20, marginBottom: 18, textAlign: 'center' },
  scanBtn: { backgroundColor: c.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  scanBtnText: { fontWeight: '700', fontSize: 16, color: c.accentInk },
  or: { textAlign: 'center', color: c.muted, fontSize: 13, marginVertical: 14 },
  label: { fontSize: 12, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: c.line, backgroundColor: c.bg2, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 16, color: c.text },
  code: { height: 58, fontSize: 24, letterSpacing: 4, textAlign: 'center', fontWeight: '800', fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  error: { color: c.neg, fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  button: { backgroundColor: c.bg2, borderWidth: 1, borderColor: c.accent, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonText: { fontWeight: '700', fontSize: 16, color: c.text },
  disabled: { opacity: 0.5 },
  link: { alignSelf: 'center', paddingVertical: 12, marginTop: 6 },
  linkText: { color: c.muted, fontSize: 14, fontWeight: '600' },
  camera: { width: '100%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: '62%', aspectRatio: 1, borderWidth: 3, borderColor: c.accent, borderRadius: 16 },
  cameraBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  cameraBusyText: { color: '#fff', fontWeight: '700' },
});
