import React, { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppProvider } from './src/context/AppProvider';
import { useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark } = useTheme();
  const { resetInactivityTimer } = useAuth();

  // Reset inactivity timer on any user touch anywhere in the app
  const handleTouchActivity = useCallback(() => {
    resetInactivityTimer();
    return false; // Don't capture the touch — let it propagate
  }, [resetInactivityTimer]);

  return (
    <View style={{ flex: 1 }} onStartShouldSetResponderCapture={handleTouchActivity}>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide splash screen as soon as fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </View>
  );
}
