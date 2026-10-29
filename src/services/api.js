import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getCredentials } from '../utils/auth';
import { getActiveBar, getActiveView } from '../utils/activeBar';

const BASE_URL = 'https://ghetto.co.bw/wp-json';

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
    if (getActiveView()) headers['X-ZBS-View'] = String(getActiveView());
    else if (getActiveBar()) headers['X-ZBS-Bar'] = String(getActiveBar());
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

export function pinLogin({ pin, device, device_token }) {
  return request('/zbs/v1/app-login', { method: 'POST', auth: false, body: { pin, device, device_token } });
}

export function accountLogin({ username, password }) {
  return request('/zbs/v1/login', { method: 'POST', auth: false, body: { username, password } });
}

// --- zbs/v1: the bars this account works at, and switching between them ---

export function getBars() {
  return request('/zbs/v1/bars');
}

/** Returns { bar, role, manage, capture, settings, bars } for the bar switched to. */
export function switchBar(bar) {
  return request('/zbs/v1/bars/switch', { method: 'POST', body: { bar } });
}

// --- zbs/v1: Verifiers (platform staff): bars waiting for approval, and support "View as" ---

export function getPlatformBars(status) {
  return request('/zbs/v1/platform/bars', { query: { status } });
}

/** approve: true, or false with a reason (emailed to the owner). Returns the bar as the platform sees it. */
export function decideBar(id, approve, reason) {
  return request(`/zbs/v1/platform/bars/${id}/${approve ? 'approve' : 'decline'}`, { method: 'POST', body: approve ? {} : { reason } });
}

/** Read-only, up to an hour; the reason goes in the bar's activity log. Returns { bar, name, status, reason, expires_in }. */
export function startSupportView(id, reason) {
  return request(`/zbs/v1/platform/bars/${id}/view`, { method: 'POST', body: { reason } });
}

/** The live support view, or { bar: 0 }. */
export function getSupportView() {
  return request('/zbs/v1/platform/view');
}

export function endSupportView() {
  return request('/zbs/v1/platform/view', { method: 'DELETE' });
}

// --- zbs/v1: sign-up (no account yet) and the bar's own status ---

export function signupCheck(slug) {
  return request('/zbs/v1/signup/check', { auth: false, query: { slug } });
}

export function signupStart({ bar_name, bar_slug, name, email, password }) {
  return request('/zbs/v1/signup/start', { method: 'POST', auth: false, body: { bar_name, bar_slug, name, email, password } });
}

/** The right code creates the account and the bar (pending) and returns an app sign-in, like accountLogin. */
export function signupVerify({ token, code }) {
  return request('/zbs/v1/signup/verify', { method: 'POST', auth: false, body: { token, code, client: 'app' } });
}

/** { status: pending | active | declined, note, deletes, role, setup: { items, priced, cashiers, managers } } */
export function getBar() {
  return request('/zbs/v1/bar');
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

// --- zbs/v1: managers (managers only). New managers get an email invite to set their own password. ---

export function getManagers() {
  return request('/zbs/v1/managers');
}

export function inviteManager({ name, email }) {
  return request('/zbs/v1/managers', { method: 'POST', body: { name, email } });
}

export function resendManagerInvite(id) {
  return request(`/zbs/v1/managers/${id}/resend`, { method: 'POST' });
}

export function removeManager(id) {
  return request(`/zbs/v1/managers/${id}`, { method: 'DELETE' });
}

// --- zbs/v1: devices. A manager links a phone with a one-time code or QR; passcodes then only work for that bar. ---

/** The new device, nobody signed in: a typed code or a scanned QR. Returns { device_token, device, bar }. */
export function linkDevice({ code, qr, name, platform }) {
  return request('/zbs/v1/devices/link', { method: 'POST', auth: false, body: { code, qr, name, platform } });
}

/** Which of this phone's links still work, and whether any bar still takes passcodes without one. */
export function checkDevices(tokens) {
  return request('/zbs/v1/devices/check', { method: 'POST', auth: false, body: { tokens } });
}

export function getDevices() {
  return request('/zbs/v1/devices');
}

export function setDevicesRequired(required) {
  return request('/zbs/v1/devices/settings', { method: 'POST', body: { required } });
}

export function renameDevice(id, name) {
  return request(`/zbs/v1/devices/${id}`, { method: 'POST', body: { name } });
}

export function unlinkDevice(id) {
  return request(`/zbs/v1/devices/${id}`, { method: 'DELETE' });
}

export function newLinkSession() {
  return request('/zbs/v1/devices/sessions', { method: 'POST' });
}

export function getLinkSession(id) {
  return request(`/zbs/v1/devices/sessions/${id}`);
}

export function cancelLinkSession(id) {
  return request(`/zbs/v1/devices/sessions/${id}`, { method: 'DELETE' });
}

// --- zbs/v1: suggested items for a new bar's first 7 days (managers only) ---

export function getSuggestions() {
  return request('/zbs/v1/suggestions');
}

/** what: add | dismiss | restore | hide | show. body: { keys?: string[], all?: boolean } */
export function suggestionsDo(what, body = {}) {
  return request(`/zbs/v1/suggestions/${what}`, { method: 'POST', body });
}

// --- zbs/v1: activity log (managers only). group: items | staff | sheets | exports | bar ---

export function getActivity({ group, q, page } = {}) {
  return request('/zbs/v1/activity', { query: { group, q, page, per_page: 40 } });
}

// --- zbs/v1: stock items + reports (managers only) ---

export function getItems() {
  return request('/zbs/v1/items');
}

export function createItem({ name, group, price }) {
  return request('/zbs/v1/items', { method: 'POST', body: { name, group, price } });
}

export function updateItem(id, { name, group, price, active } = {}) {
  return request(`/zbs/v1/items/${id}`, { method: 'POST', body: { name, group, price, active } });
}

export function deleteItem(id) {
  return request(`/zbs/v1/items/${id}`, { method: 'DELETE' });
}

export function getReport({ from, to }) {
  return request('/zbs/v1/report', { query: { from, to } });
}

const MIME = {
  xlsx: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', UTI: 'org.openxmlformats.spreadsheetml.sheet' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
};

/** Downloads an export to the cache directory, then opens the phone's share/open sheet for it. */
async function shareExport(path, filename, format) {
  const file = new File(Paths.cache, filename);
  try {
    await File.downloadFileAsync(`${BASE_URL}${path}`, file, { headers: await authHeader(), idempotent: true });
  } catch {
    throw new Error("Couldn't download the file. Check your connection and try again.");
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing files isn't available on this phone.");
  await Sharing.shareAsync(file.uri, { ...MIME[format], dialogTitle: file.name });
}

export function shareReportExport({ from, to, only, format }) {
  const params = new URLSearchParams({ from, to, only: only ? '1' : '0', format });
  return shareExport(`/zbs/v1/export/report?${params}`, `stock-variance-${from}-to-${to}.${format}`, format);
}

export function shareSheetExport({ id, date, format }) {
  return shareExport(`/zbs/v1/export/sheet/${id}?format=${format}`, `stock-sheet-${date}.${format}`, format);
}

// --- zbs/v1: AI assistant (managers only) ---

// The server may run several tool rounds and one retry; give it longer than a normal request.
const AI_TIMEOUT_MS = 75000;

export function getAiStatus() {
  return request('/zbs/v1/ai/status');
}

/** Cached shift brief for a sheet, or { summary: null }. Never calls the AI. */
export function getSheetSummary(id) {
  return request(`/zbs/v1/ai/sheets/${id}/summary`);
}

/** Writes the brief (or returns the cached one if the sheet hasn't changed). */
export function makeSheetSummary(id, { force } = {}) {
  return request(`/zbs/v1/ai/sheets/${id}/summary`, { method: 'POST', body: { force: !!force }, timeoutMs: AI_TIMEOUT_MS });
}

/** messages: [{ role: 'user' | 'assistant', content }], newest last. */
export function askAi({ messages, sheet_id }) {
  return request('/zbs/v1/ai/chat', { method: 'POST', body: { messages, sheet_id }, timeoutMs: AI_TIMEOUT_MS });
}

// --- zbs/v1: account ---

export function requestAccountDeletion({ message } = {}) {
  return request('/zbs/v1/delete-request', { method: 'POST', body: { message } });
}
