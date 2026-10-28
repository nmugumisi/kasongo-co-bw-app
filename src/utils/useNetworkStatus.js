import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

function isOnlineState(state) {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/** Live connectivity status. Also re-checks when the app returns to the foreground, since a
 * stale NetInfo read can otherwise linger across a phone's sleep/wake. */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => setIsOnline(isOnlineState(state)));
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        NetInfo.fetch().then((state) => setIsOnline(isOnlineState(state)));
      }
    });
    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return isOnline;
}
