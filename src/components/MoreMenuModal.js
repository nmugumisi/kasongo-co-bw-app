import React, { useEffect, useRef } from 'react';
import { Animated, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function MoreMenuModal({ visible, onClose }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, canManage, logOut } = useAuth();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [visible]);

  const items = [
    { label: 'Settings', screen: 'Main', params: { screen: 'Settings' } },
    ...(canManage ? [{ label: 'Bar settings', screen: 'BarSettings' }] : []),
    ...(canManage ? [{ label: 'Cashiers', screen: 'Cashiers' }] : []),
    { label: 'About', screen: 'About' },
  ];

  function handlePress(item) {
    onClose();
    navigation.navigate(item.screen, item.params);
  }

  async function handleLogout() {
    onClose();
    await logOut();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[
            styles.menu,
            {
              top: insets.top + 56,
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
            },
          ]}
        >
          {items.map((item) => (
            <TouchableOpacity key={item.label} style={styles.item} onPress={() => handlePress(item)}>
              <Text style={styles.itemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          {isLoggedIn ? (
            <TouchableOpacity style={styles.item} onPress={handleLogout}>
              <Text style={[styles.itemText, styles.logout]}>Sign out</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  menu: {
    position: 'absolute',
    right: 16,
    minWidth: 180,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  item: { paddingHorizontal: 20, paddingVertical: 10 },
  itemText: { fontSize: 15, fontFamily: FONTS.regular, color: colors.ink },
  logout: { color: colors.danger },
});
