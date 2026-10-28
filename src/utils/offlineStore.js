// Thin AsyncStorage wrapper for offline caches and sync queues. Mirrors the key scheme
// zbs-app.js uses in localStorage, scoped per sheet and (for write queues) per signed-in user
// so a shared device's offline entries from one cashier never get sent under the next one's name.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJSON(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setJSON(key, value) {
  try {
    if (value === null || value === undefined) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // best-effort cache; losing a write here just means a cold start without cached data
  }
}

export const sheetCacheKey = (id) => `zbsa_cache_sheet_${id}`;
export const sheetsListCacheKey = () => 'zbsa_cache_sheets';
export const settingsCacheKey = () => 'zbsa_cache_settings';
export const pendingLinesKey = (username, sheetId) => `zbsa_q_${username || 0}_${sheetId}`;
export const pendingReceiptsKey = (username, sheetId) => `zbsa_rq_${username || 0}_${sheetId}`;
