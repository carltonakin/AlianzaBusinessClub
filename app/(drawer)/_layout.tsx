import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { DrawerContent } from '@/components/DrawerContent';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: 280 },
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="home" />
      <Drawer.Screen name="magazine" />
      <Drawer.Screen name="events" />
      <Drawer.Screen name="store" />
      <Drawer.Screen name="training" />
      <Drawer.Screen name="interviews" />
      <Drawer.Screen name="webinars" />
      <Drawer.Screen name="community" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="admin" />
      <Drawer.Screen name="webview" />
      <Drawer.Screen name="notifications" />
    </Drawer>
  );
}
