import { getCredentials } from '../utils/auth';

const BASE_URL = 'https://kasongo.co.bw/wp-json';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(input) {
  let output = '';
  let i = 0;
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = i < input.length ? input.charCodeAt(i++) : NaN;
    const c = i < input.length ? input.charCodeAt(i++) : NaN;

    const n1 = a >> 2;
    const n2 = ((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4);
    const n3 = isNaN(b) ? 64 : ((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6);
    const n4 = isNaN(c) ? 64 : c & 63;

    output +=
      BASE64_CHARS[n1] +
      BASE64_CHARS[n2] +
      (n3 === 64 ? '=' : BASE64_CHARS[n3]) +
      (n4 === 64 ? '=' : BASE64_CHARS[n4]);
  }
  return output;
}

async function authHeader() {
  const creds = await getCredentials();
  if (!creds) return {};
  const token = base64Encode(`${creds.username}:${creds.application_password}`);
  return { Authorization: `Basic ${token}` };
}

async function request(path, { method = 'GET', body, auth = true, query, timeoutMs = 15000 } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    Object.assign(headers, await authHeader());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = data?.message || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// --- zbs/v1: sign-in ---

export function pinLogin({ pin, device }) {
  return request('/zbs/v1/app-login', { method: 'POST', auth: false, body: { pin, device } });
}

// --- zbs/v1: bar settings ---

export function getSettings() {
  return request('/zbs/v1/settings');
}

export function saveSettings({ bar_name, show_values, currency }) {
  return request('/zbs/v1/settings', { method: 'POST', body: { bar_name, show_values, currency } });
}

// --- zbs/v1: sheets ---

export function getSheets({ limit } = {}) {
  return request('/zbs/v1/sheets', { query: { limit } });
}

export function createSheet({ date, cashier } = {}) {
  return request('/zbs/v1/sheets', { method: 'POST', body: { date, cashier } });
}

export function getSheet(id) {
  return request(`/zbs/v1/sheets/${id}`);
}

export function updateSheet(id, { cashier, notes } = {}) {
  return request(`/zbs/v1/sheets/${id}`, { method: 'POST', body: { cashier, notes } });
}

export function saveLines(id, lines) {
  return request(`/zbs/v1/sheets/${id}/lines`, { method: 'POST', body: { lines } });
}

export function addReceipt(id, { item_id, qty, note, client_id, at } = {}) {
  return request(`/zbs/v1/sheets/${id}/receipts`, { method: 'POST', body: { item_id, qty, note, client_id, at } });
}

export function voidReceipt(id, rid) {
  return request(`/zbs/v1/sheets/${id}/receipts/${rid}/void`, { method: 'POST' });
}

export function addNote(id, body) {
  return request(`/zbs/v1/sheets/${id}/notes`, { method: 'POST', body: { body } });
}

export function deleteNote(id, nid) {
  return request(`/zbs/v1/sheets/${id}/notes/${nid}`, { method: 'DELETE' });
}

export function closeSheet(id, { notes } = {}) {
  return request(`/zbs/v1/sheets/${id}/close`, { method: 'POST', body: { notes } });
}

export function reopenSheet(id) {
  return request(`/zbs/v1/sheets/${id}/reopen`, { method: 'POST' });
}

// --- zbs/v1: cashiers (managers only) ---

export function getCashiers() {
  return request('/zbs/v1/cashiers');
}

export function createCashier({ name, pin }) {
  return request('/zbs/v1/cashiers', { method: 'POST', body: { name, pin } });
}

export function updateCashier(id, { pin, disabled } = {}) {
  return request(`/zbs/v1/cashiers/${id}`, { method: 'POST', body: { pin, disabled } });
}

export function deleteCashier(id) {
  return request(`/zbs/v1/cashiers/${id}`, { method: 'DELETE' });
}
