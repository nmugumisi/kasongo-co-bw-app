import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom padding that clears the phone's navigation buttons / gesture bar, the same way the
 * Crop app pads its tab bar (insets.bottom + a little extra). Android draws apps edge-to-edge,
 * so anything at the bottom of a screen or slide-up sheet needs this or it ends up underneath.
 */
export function useBottomCushion(extra = 16) {
  return useSafeAreaInsets().bottom + extra;
}
