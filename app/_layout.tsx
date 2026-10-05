import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, Alert, Platform } from 'react-native';
import { useNetworkState } from 'expo-network';
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/utils/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('[Notifications] Foreground notification received');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

SplashScreen.preventAutoHideAsync();

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

async function registerPushToken(userId: string) {
  if (!Device.isDevice) {
    console.log('[Notifications] Skipping push token registration — not a physical device');
    return;
  }
  try {
    console.log('[Notifications] Requesting push notification permissions');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Notifications] Permissions not granted, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied, skipping push token registration');
      return;
    }

    console.log('[Notifications] Getting Expo push token');
    const isExpoGo = Constants.appOwnership === 'expo';
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      isExpoGo || !projectId ? {} : { projectId }
    );
    const token = tokenData.data;
    console.log('[Notifications] Push token obtained:', token);

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('[Notifications] Failed to save push token:', error.message);
    } else {
      console.log('[Notifications] Push token saved to profile for user:', userId);
    }
  } catch (err) {
    console.error('[Notifications] Error registering push token:', err);
  }
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inConfirmScreen = segments[0] === 'confirm';
    // Let the confirm screen handle its own redirect after OTP verification
    if (inConfirmScreen) return;
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(drawer)/home');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, segments]);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (Platform.OS === 'web') return;
    console.log('[Notifications] Session detected, registering push token for user:', session.user.id);
    registerPushToken(session.user.id);
  }, [session?.user?.id]);

  // Handle notification tap (app backgrounded/closed)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      console.log('[Notifications] Notification tapped, navigating to notifications screen');
      router.push('/(drawer)/notifications');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Foreground notification received:', notification.request.content.title);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (Platform.OS === 'web') return;

    console.log('[Realtime] Subscribing to push_notifications channel for user:', session.user.id);

    const channel = supabase
      .channel('new_push_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'push_notifications' },
        async (payload) => {
          console.log('[Realtime] New push_notification row received:', payload.new);
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: payload.new.title,
                body: payload.new.body,
                sound: true,
              },
              trigger: null,
            });
            console.log('[Realtime] Local notification scheduled for:', payload.new.title);
          } catch (err) {
            console.error('[Realtime] Failed to schedule local notification:', err);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] push_notifications channel status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from push_notifications channel');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="confirm" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        'You are offline',
        'You can keep using the app! Your changes will be saved locally and synced when you are back online.'
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (!fontsLoaded) return null;

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: '#1B4FD8',
      background: '#F4F6FB',
      card: '#FFFFFF',
      text: '#0F1729',
      border: 'rgba(27,79,216,0.08)',
      notification: '#EF4444',
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: '#1B4FD8',
      background: '#0F1729',
      card: '#1A2340',
      text: '#F4F6FB',
      border: 'rgba(27,79,216,0.2)',
      notification: '#EF4444',
    },
  };

  return (
    <DevErrorBoundary>
      <StatusBar style="auto" animated />
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <RootNavigator />
              <SystemBars style="auto" />
            </AuthProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
