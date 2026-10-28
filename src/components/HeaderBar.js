import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreVertical } from 'lucide-react-native';
import MoreMenuModal from './MoreMenuModal';
import { useAuth } from '../utils/AuthContext';
import { colors } from '../theme/colors';
import { FONTS } from '../theme/typography';

export default function HeaderBar({ subtitle }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { settings } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const shownSubtitle = subtitle ?? settings?.bar_name;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity style={styles.brand} onPress={() => navigation.navigate('Main', { screen: 'Today' })}>
        <Image source={require('../../assets/kasongo-icon-small.png')} style={styles.logo} />
        <View>
          <Text style={styles.brandText}>Kasongo</Text>
          {shownSubtitle ? <Text style={styles.subtitle}>{shownSubtitle}</Text> : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.kebab} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MoreVertical size={24} color={colors.ink} />
      </TouchableOpacity>

      <MoreMenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 8 },
  brandText: { fontSize: 20, fontFamily: FONTS.lato, letterSpacing: -0.4, color: colors.ink, lineHeight: 22 },
  subtitle: { fontSize: 12, fontFamily: FONTS.regular, color: colors.subtleText },
  kebab: { padding: 4 },
});
