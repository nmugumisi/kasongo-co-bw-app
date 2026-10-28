// Mirrors fmt/signed/money/units/niceDate in zs-bar-stock/assets/zbs-app.js.
import { r2 } from './calc';

export function fmt(n) {
  if (n === null || n === undefined) return '-';
  n = r2(n);
  return Number.isInteger(n) ? String(n) : String(n.toFixed(2)).replace(/0$/, '');
}

export function signed(n) {
  n = r2(n);
  return (n > 0 ? '+' : '') + fmt(n);
}

export function units(n) {
  n = r2(Math.abs(n));
  return fmt(n);
}

export function money(n, currency) {
  const s = Math.abs(r2(n)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '−' : '') + (currency || '') + s;
}

export function niceDate(iso, long) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
}

export function titleCase(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Tendai, Rudo +2": who has worked on a sheet. */
export function people(list, fallback) {
  const l = list && list.length ? list : fallback ? [fallback] : [];
  if (!l.length) return '';
  return l.slice(0, 2).join(', ') + (l.length > 2 ? ` +${l.length - 2}` : '');
}

export function hhmm(d) {
  d = d || new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
