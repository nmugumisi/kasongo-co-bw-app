import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Appearance, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { getCredentials, saveCredentials, clearCredentials, getBiometricEnabled, setBiometricEnabled as persistBiometricEnabled } from './auth';
import { getSettings } from '../services/api';
import { getJSON, setJSON, settingsCacheKey } from './offlineStore';

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
  const [theme, setTheme] = useState('dark');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  // The system biometric prompt itself sends the app to inactive/background on some devices;
  // without this, unlocking would immediately re-lock.
  const promptOpen = useRef(false);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      if (s) {
        const merged = { ...DEFAULT_SETTINGS, ...s };
        setSettings(merged);
        setJSON(settingsCacheKey(), merged);
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

  useEffect(() => {
    getCredentials().then(async (creds) => {
      setUser(creds);
      if (creds) {
        // Show the real bar name immediately on a cold start even with no connectivity yet,
        // then quietly refresh from the server in the background.
        const cached = await getJSON(settingsCacheKey());
        if (cached) setSettings({ ...DEFAULT_SETTINGS, ...cached });
        refreshSettings();

        const bioOn = await getBiometricEnabled();
        setBiometricEnabledState(bioOn);
        if (bioOn && creds.manage) setLocked(true); // require a fresh unlock every cold start, not just once
      }
      setLoading(false);
    });
  }, [refreshSettings]);

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
      setUser(creds);
      setBiometricEnabledState(false);
      setLocked(false);
      refreshSettings();
    },
    [refreshSettings]
  );

  const logOut = useCallback(async () => {
    await clearCredentials();
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
