import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCredentials, saveCredentials, clearCredentials } from './auth';
import { getSettings } from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_SETTINGS = { bar_name: 'Bar Stock', show_values: false, currency: '' };
const THEME_KEY = 'zbsa_theme';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState('dark');

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
    } catch {
      // keep whatever we already had
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
    getCredentials().then((creds) => {
      setUser(creds);
      setLoading(false);
      if (creds) refreshSettings();
    });
  }, [refreshSettings]);

  const logIn = useCallback(
    async (data) => {
      await saveCredentials(data);
      const creds = await getCredentials();
      setUser(creds);
      refreshSettings();
    },
    [refreshSettings]
  );

  const logOut = useCallback(async () => {
    await clearCredentials();
    setUser(null);
    setSettings(DEFAULT_SETTINGS);
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
