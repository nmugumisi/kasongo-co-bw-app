// Mirrors zs-bar-stock/assets/zbs-app.css custom properties exactly, light and dark.
import { useAuth } from '../utils/AuthContext';

export const DARK = {
  bg: '#0e1014',
  bg2: '#161a20',
  card: '#1b2028',
  card2: '#232934',
  line: 'rgba(255,255,255,0.08)',
  text: '#eef1f5',
  muted: '#8b95a5',
  accent: '#f5b83d',
  accentInk: '#1a1305',
  neg: '#ff6b6b',
  negBg: 'rgba(255,107,107,0.12)',
  pos: '#4fd18b',
  posBg: 'rgba(79,209,139,0.12)',
  warn: '#ffcc66',
  warnBg: 'rgba(255,204,102,0.12)',
};

export const LIGHT = {
  bg: '#f4f5f7',
  bg2: '#ffffff',
  card: '#ffffff',
  card2: '#eef0f3',
  line: 'rgba(15,23,42,0.09)',
  text: '#121620',
  muted: '#637085',
  accent: '#e0a020',
  accentInk: '#1a1305',
  neg: '#d63939',
  negBg: 'rgba(214,57,57,0.09)',
  pos: '#148a4f',
  posBg: 'rgba(20,138,79,0.09)',
  warn: '#a86b00',
  warnBg: 'rgba(224,160,32,0.14)',
};

export function colorsFor(theme) {
  return theme === 'light' ? LIGHT : DARK;
}

export function useZbsColors() {
  const { theme } = useAuth();
  return colorsFor(theme);
}
