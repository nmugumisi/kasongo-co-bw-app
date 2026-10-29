import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { getCredentials, saveCredentials, saveBar, clearCredentials, getBiometricEnabled, setBiometricEnabled as persistBiometricEnabled } from './auth';
import { getSettings, getBars, switchBar as apiSwitchBar } from '../services/api';
import { getJSON, setJSON, settingsCacheKey, barsCacheKey } from './offlineStore';
import { getActiveBar, setActiveBar } from './activeBar';

const AuthContext = createContext(null);

const DEFAULT_SETTINGS = { bar_name: 'Bar Stock', show_values: false, currency: '' };
const THEME_KEY = 'zbsa_theme';

export async function checkBiometricSupport() {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [bars, setBars] = useState([]); // [{ id, name, slug, status, role }]
  const [barId, setBarId] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  // The system biometric prompt itself sends the app to inactive/background on some devices;
  // without this, unlocking would immediately re-lock.
  const promptOpen = useRef(false);

  const refreshSettings = useCallback(async () => {
    const key = settingsCacheKey(); // the bar this was asked for, even if it changes meanwhile
    try {
      const s = await getSettings();
      if (s && key === settingsCacheKey()) {
        const merged = { ...DEFAULT_SETTINGS, ...s };
        setSettings(merged);
        setJSON(key, merged);
      }
    } catch {
      // offline or unreachable: whatever's already showing (cache or default) stays
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      } else {
        setTheme(Appearance.getColorScheme() === 'light' ? 'light' : 'dark');
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    checkBiometricSupport().then(setBiometricSupported);
  }, []);

  /**
   * Switch this phone to another bar. The server says what this account may do there (a manager at
   * one bar can be a cashier at another) and sends the bar's profile; the screens start again from
   * Home in the new bar (AppNavigator is keyed on barId).
   */
  const switchBar = useCallback(async (id) => {
    const r = await apiSwitchBar(id);
    setActiveBar(r.bar);
    await saveBar({ bar: r.bar, manage: r.manage });
    const merged = { ...DEFAULT_SETTINGS, ...r.settings };
    setJSON(settingsCacheKey(), merged);
    setSettings(merged);
    setBars(r.bars || []);
    setJSON(barsCacheKey(), r.bars || []);
    setUser((u) => (u ? { ...u, manage: !!r.manage, bar: r.bar } : u));
    setBarId(r.bar);
  }, []);

  // Which bars this account works at. If the bar this phone was on is no longer one of them
  // (removed by its owner), move to where the server would open it instead.
  const refreshBars = useCallback(async () => {
    try {
      const r = await getBars();
      setBars(r.bars || []);
      setJSON(barsCacheKey(), r.bars || []);
      const target = r.current ? 0 : r.default || r.bars?.[0]?.id || 0;
      if (!r.current && target) await switchBar(target);
      else if (r.current && r.current !== getActiveBar()) {
        // An older install with no bar remembered: keep whatever the server picked.
        setActiveBar(r.current);
        setBarId(r.current);
      }
    } catch {
      // offline: the cached list stays
    }
  }, [switchBar]);

  useEffect(() => {
    getCredentials().then(async (creds) => {
      setUser(creds);
      if (creds) {
        setActiveBar(creds.bar);
        setBarId(creds.bar);
        // Show the real bar name immediately on a cold start even with no connectivity yet,
        // then quietly refresh from the server in the background.
        const [cached, cachedBars] = await Promise.all([getJSON(settingsCacheKey()), getJSON(barsCacheKey())]);
        if (cached) setSettings({ ...DEFAULT_SETTINGS, ...cached });
        if (cachedBars) setBars(cachedBars);
        refreshSettings();
        refreshBars();

        const bioOn = await getBiometricEnabled();
        setBiometricEnabledState(bioOn);
        if (bioOn && creds.manage) setLocked(true); // require a fresh unlock every cold start, not just once
      }
      setLoading(false);
    });
  }, [refreshSettings, refreshBars]);

  // Returning to the app from the background re-locks it, same as a cold start — otherwise
  // biometric gating would only ever matter once, which defeats the point of "protect an
  // unattended phone".
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appState.current = next;
      if (next === 'background' && !promptOpen.current && biometricEnabled && user?.manage) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, user]);

  const authenticate = useCallback(async (promptMessage) => {
    promptOpen.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel', disableDeviceFallback: false });
      return res.success;
    } catch {
      return false;
    } finally {
      // Let the app settle back to 'active' before re-arming the background lock.
      setTimeout(() => {
        promptOpen.current = false;
      }, 1000);
    }
  }, []);

  const unlockWithBiometrics = useCallback(async () => {
    const ok = await authenticate('Unlock Kasongo');
    if (ok) setLocked(false);
    return ok;
  }, [authenticate]);

  const setBiometricEnabled = useCallback(async (enabled) => {
    await persistBiometricEnabled(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  const logIn = useCallback(
    async (data) => {
      await saveCredentials(data);
      const creds = await getCredentials();
      setActiveBar(creds.bar);
      setBarId(creds.bar);
      setBars(Array.isArray(data.bars) ? data.bars : []);
      setJSON(barsCacheKey(), Array.isArray(data.bars) ? data.bars : []);
      setUser(creds);
      setBiometricEnabledState(false);
      setLocked(false);
      refreshSettings();
    },
    [refreshSettings]
  );

  const logOut = useCallback(async () => {
    await clearCredentials();
    setActiveBar(0);
    setBarId(0);
    setBars([]);
    setJSON(barsCacheKey(), null);
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
    setBiometricEnabledState(false);
    setLocked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        canManage: !!user?.manage,
        settings,
        refreshSettings,
        bars,
        barId,
        // Managers only: a cashier at two bars picks the bar on the keypad, where the phone's link decides.
        canSwitchBar: bars.length > 1 && bars.some((b) => b.role === 'owner' || b.role === 'manager'),
        switchBar,
        theme,
        toggleTheme,
        biometricEnabled,
        biometricSupported,
        setBiometricEnabled,
        locked,
        unlockWithBiometrics,
        authenticate,
        logIn,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
