/**
 * SpendWise LoadingSpinner Component
 * Activity indicator using theme primary color.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

function LoadingSpinner({ size = 'large', message, style }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, style]} accessibilityRole="progressbar">
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.md },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default LoadingSpinner;
