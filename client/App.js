import React, { useEffect } from 'react';
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
import RootNavigator from './src/navigation/RootNavigator';
import BiometricLock from './src/components/BiometricLock';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <BiometricLock>
        <RootNavigator />
      </BiometricLock>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
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
