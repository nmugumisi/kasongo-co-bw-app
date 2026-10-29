import * as SecureStore from 'expo-secure-store';

const USERNAME_KEY = 'kasongo_username';
const PASSWORD_KEY = 'kasongo_application_password';
const NAME_KEY = 'kasongo_display_name';
const MANAGE_KEY = 'kasongo_can_manage';
const BIOMETRIC_KEY = 'kasongo_biometric_enabled';
const BAR_KEY = 'kasongo_bar';
const VERIFY_KEY = 'kasongo_verify';

export async function saveCredentials({ username, application_password, name, manage, bar, verify }) {
  await SecureStore.setItemAsync(USERNAME_KEY, username ?? '');
  await SecureStore.setItemAsync(PASSWORD_KEY, application_password ?? '');
  await SecureStore.setItemAsync(NAME_KEY, name ?? '');
  await SecureStore.setItemAsync(MANAGE_KEY, manage ? '1' : '0');
  await SecureStore.setItemAsync(VERIFY_KEY, verify ? '1' : '0');
  // Sign-up answers with the bar's details; the sign-ins with its id.
  await SecureStore.setItemAsync(BAR_KEY, String((bar && typeof bar === 'object' ? bar.id : bar) || 0));
}

/** After switching bars: what this account may do there, and which bar the app opens in. */
export async function saveBar({ bar, manage }) {
  await SecureStore.setItemAsync(BAR_KEY, String(bar || 0));
  await SecureStore.setItemAsync(MANAGE_KEY, manage ? '1' : '0');
}

export async function getCredentials() {
  const [username, application_password, name, manage, bar, verify] = await Promise.all([
    SecureStore.getItemAsync(USERNAME_KEY),
    SecureStore.getItemAsync(PASSWORD_KEY),
    SecureStore.getItemAsync(NAME_KEY),
    SecureStore.getItemAsync(MANAGE_KEY),
    SecureStore.getItemAsync(BAR_KEY),
    SecureStore.getItemAsync(VERIFY_KEY),
  ]);
  if (!username || !application_password) return null;
  return { username, application_password, name, manage: manage === '1', bar: parseInt(bar || '0', 10) || 0, verify: verify === '1' };
}

const DEVICE_ID_KEY = 'kasongo_device_id';

function randomId() {
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += Math.floor(Math.random() * 36).toString(36);
  }
  return id;
}

/** Stable per-install id the server uses to scope passcode-lockout attempts to this device. */
export async function getOrCreateDeviceId() {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}

// Bars this phone is linked to: [{ token, bar: { id, name, slug }, device: { id, name } }]. Kept across sign-outs:
// a link belongs to the phone, not to whoever signed in on it.
const LINKS_KEY = 'kasongo_device_links';
const LINK_CUR_KEY = 'kasongo_device_link_bar';

export async function getLinks() {
  try {
    const list = JSON.parse((await SecureStore.getItemAsync(LINKS_KEY)) || '[]');
    return Array.isArray(list) ? list.filter((l) => l && l.token && l.bar) : [];
  } catch {
    return [];
  }
}

export async function saveLinks(list) {
  await SecureStore.setItemAsync(LINKS_KEY, JSON.stringify(list));
}

export async function getLinkBar() {
  return parseInt((await SecureStore.getItemAsync(LINK_CUR_KEY)) || '0', 10) || 0;
}

export async function setLinkBar(id) {
  await SecureStore.setItemAsync(LINK_CUR_KEY, String(id || 0));
}

export async function clearCredentials() {
  await Promise.all([
    SecureStore.deleteItemAsync(USERNAME_KEY),
    SecureStore.deleteItemAsync(PASSWORD_KEY),
    SecureStore.deleteItemAsync(NAME_KEY),
    SecureStore.deleteItemAsync(MANAGE_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_KEY),
    SecureStore.deleteItemAsync(BAR_KEY),
    SecureStore.deleteItemAsync(VERIFY_KEY),
  ]);
}

/** Whether this signed-in account unlocks the app with Face ID / fingerprint instead of re-entering a password. */
export async function getBiometricEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1';
}

export async function setBiometricEnabled(enabled) {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? '1' : '0');
}
