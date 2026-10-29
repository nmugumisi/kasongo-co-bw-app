// Thin AsyncStorage wrapper for offline caches and sync queues. Mirrors the key scheme
// zbs-app.js uses in localStorage, scoped per sheet and (for write queues) per signed-in user
// so a shared device's offline entries from one cashier never get sent under the next one's name.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheScope } from './activeBar';

export async function getJSON(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** After a support view: drop what was cached while looking (sheets and the bar profile). */
export async function clearViewCaches() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => /^zbsa_cache_(sheet_\d+|sheets_v\d+|settings_v\d+)$/.test(k)));
  } catch {
    // best-effort
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
// Sheet ids are unique across bars; the list and the bar profile are not, so they're kept per bar.
export const sheetsListCacheKey = () => `zbsa_cache_sheets_${cacheScope()}`;
export const settingsCacheKey = () => `zbsa_cache_settings_${cacheScope()}`;
export const barsCacheKey = () => 'zbsa_cache_bars';
export const pendingLinesKey = (username, sheetId) => `zbsa_q_${username || 0}_${sheetId}`;
export const pendingReceiptsKey = (username, sheetId) => `zbsa_rq_${username || 0}_${sheetId}`;
