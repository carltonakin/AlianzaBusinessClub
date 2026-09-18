import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { RefreshCw } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { DrawerHeader } from '@/components/DrawerHeader';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const MAGAZINE_URL = 'https://alianzaempresarial.online';

export default function MagazineScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  const handleLoadStart = () => {
    console.log('[Magazine] WebView loading started:', MAGAZINE_URL);
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    console.log('[Magazine] WebView loaded successfully');
    setLoading(false);
  };

  const handleError = () => {
    console.error('[Magazine] WebView failed to load');
    setLoading(false);
    setError(true);
  };

  const handleRetry = () => {
    console.log('[Magazine] Retry button pressed');
    setKey((k) => k + 1);
    setError(false);
    setLoading(true);
  };

  return (
    <View style={styles.container}>
      <DrawerHeader title="AB Club - Magazine" />
      <View style={styles.webviewContainer}>
        {!error ? (
          <WebView
            key={key}
            source={{ uri: MAGAZINE_URL }}
            style={styles.webview}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : null}
        {loading && !error ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading magazine...</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Failed to load</Text>
            <Text style={styles.errorSubtitle}>
              Could not load the magazine. Please check your connection.
            </Text>
            <AnimatedPressable onPress={handleRetry} style={styles.retryButton}>
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </AnimatedPressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
