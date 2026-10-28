import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCredentials, saveCredentials, clearCredentials } from './auth';
import { getSettings } from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_SETTINGS = { bar_name: 'Kasongo', show_values: false, currency: '' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
    } catch {
      // keep whatever we already had
    }
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
