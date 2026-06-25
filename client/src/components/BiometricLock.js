/**
 * BiometricLock Component (Feature #2)
 * Shows biometric authentication prompt when app comes to foreground.
 * Only active when user has enabled biometric lock in Settings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, AppState, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

const BIOMETRIC_ENABLED_KEY = '@spendwise_biometric_enabled';

export default function BiometricLock({ children }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { isAuthenticated } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check if biometric is enabled on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === 'true');
    };
    checkBiometric();
  }, []);

  // Listen for app state changes
  useEffect(() => {
    let lastBackground = null;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lastBackground = Date.now();
      }

      if (nextState === 'active' && biometricEnabled && isAuthenticated && lastBackground) {
        // Lock if app was in background for more than 1 second
        const elapsed = Date.now() - lastBackground;
        if (elapsed > 1000) {
          setIsLocked(true);
        }
      }
    });

    return () => subscription.remove();
  }, [biometricEnabled, isAuthenticated]);

  // Authenticate when locked
  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SpendWise',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch {
      // Biometric failed — keep locked
    }
  }, []);

  // Auto-prompt when locked
  useEffect(() => {
    if (isLocked) {
      authenticate();
    }
  }, [isLocked, authenticate]);

  if (isLocked && biometricEnabled && isAuthenticated) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: colors.background }]}>
        <Icon name="lock" size={64} color={colors.primary} />
        <Text style={[styles.lockTitle, { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing.lg }]}>
          SpendWise Locked
        </Text>
        <Text style={[styles.lockSubtitle, { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm }]}>
          Authenticate to continue
        </Text>
        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: colors.primary, marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 }]}
          onPress={authenticate}
        >
          <Icon name="fingerprint" size={24} color="#FFFFFF" />
          <Text style={[styles.unlockText, { color: '#FFFFFF', marginLeft: spacing.sm }]}>
            Unlock
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockTitle: {},
  lockSubtitle: { textAlign: 'center' },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
