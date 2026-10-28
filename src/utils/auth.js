import * as SecureStore from 'expo-secure-store';

const USERNAME_KEY = 'kasongo_username';
const PASSWORD_KEY = 'kasongo_application_password';
const NAME_KEY = 'kasongo_display_name';
const MANAGE_KEY = 'kasongo_can_manage';

export async function saveCredentials({ username, application_password, name, manage }) {
  await SecureStore.setItemAsync(USERNAME_KEY, username ?? '');
  await SecureStore.setItemAsync(PASSWORD_KEY, application_password ?? '');
  await SecureStore.setItemAsync(NAME_KEY, name ?? '');
  await SecureStore.setItemAsync(MANAGE_KEY, manage ? '1' : '0');
}

export async function getCredentials() {
  const [username, application_password, name, manage] = await Promise.all([
    SecureStore.getItemAsync(USERNAME_KEY),
    SecureStore.getItemAsync(PASSWORD_KEY),
    SecureStore.getItemAsync(NAME_KEY),
    SecureStore.getItemAsync(MANAGE_KEY),
  ]);
  if (!username || !application_password) return null;
  return { username, application_password, name, manage: manage === '1' };
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

export async function clearCredentials() {
  await Promise.all([
    SecureStore.deleteItemAsync(USERNAME_KEY),
    SecureStore.deleteItemAsync(PASSWORD_KEY),
    SecureStore.deleteItemAsync(NAME_KEY),
    SecureStore.deleteItemAsync(MANAGE_KEY),
  ]);
}
