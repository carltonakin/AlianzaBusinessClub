import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Menu } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

interface DrawerHeaderProps {
  title: string;
  rightElement?: React.ReactNode;
}

export function DrawerHeader({ title, rightElement }: DrawerHeaderProps) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleMenuPress = () => {
    console.log('[DrawerHeader] Menu button pressed, opening drawer');
    navigation.openDrawer();
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8 },
      ]}
    >
      <Pressable onPress={handleMenuPress} style={styles.menuButton} hitSlop={8}>
        <Menu size={24} color={COLORS.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightElement ? (
        <View style={styles.rightElement}>{rightElement}</View>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  menuButton: {
    padding: 4,
    borderRadius: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: COLORS.text,
  },
  rightElement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightPlaceholder: {
    width: 32,
  },
});
