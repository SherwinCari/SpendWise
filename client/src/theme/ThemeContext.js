/**
 * SpendWise Theme Context
 * Provides dark/light mode toggle with AsyncStorage persistence.
 * Exposes current theme colors, typography, spacing, shapes, and toggleTheme function.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';
import { typography, fontFamily, fontSize, fontWeight, lineHeight } from './typography';
import { spacing } from './spacing';
import { borderRadius, shadows } from './shapes';

const THEME_STORAGE_KEY = '@spendwise_theme_mode';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted theme preference on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedMode === 'dark' || storedMode === 'light') {
          setMode(storedMode);
        }
      } catch (error) {
        // Silently fall back to light mode if storage fails
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, []);

  // Toggle between light and dark mode, persisting the choice
  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      // Persistence failure is non-critical; UI still updates
    }
  };

  const theme = useMemo(() => ({
    mode,
    isDark: mode === 'dark',
    colors: mode === 'dark' ? darkColors : lightColors,
    typography,
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    spacing,
    borderRadius,
    shadows,
    toggleTheme,
  }), [mode]);

  if (isLoading) {
    // Render children with default light theme while loading preference
    // This prevents white screen on slow AsyncStorage reads
    return (
      <ThemeContext.Provider value={theme}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
