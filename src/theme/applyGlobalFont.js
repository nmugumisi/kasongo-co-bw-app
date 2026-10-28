import { Text, TextInput, StyleSheet } from 'react-native';
import { FONTS } from './typography';

function familyForWeight(weight) {
  switch (String(weight)) {
    case '700':
    case 'bold':
      return FONTS.bold;
    case '600':
      return FONTS.semiBold;
    case '500':
      return FONTS.medium;
    default:
      return FONTS.regular;
  }
}

function withDefaultFont(type, config) {
  if ((type !== Text && type !== TextInput) || !config) return config;
  const flat = StyleSheet.flatten(config.style) || {};
  if (flat.fontFamily) return config;
  return { ...config, style: [config.style, { fontFamily: familyForWeight(flat.fontWeight) }] };
}

function patchRuntime(runtime) {
  if (!runtime || runtime.__fontPatchApplied) return;
  ['jsx', 'jsxs', 'jsxDEV'].forEach((key) => {
    const original = runtime[key];
    if (typeof original !== 'function') return;
    runtime[key] = function patched(type, config, ...rest) {
      return original(type, withDefaultFont(type, config), ...rest);
    };
  });
  runtime.__fontPatchApplied = true;
}

patchRuntime(require('react/jsx-runtime'));
patchRuntime(require('react/jsx-dev-runtime'));
