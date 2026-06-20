/**
 * SpendWise Card Component
 * Container with 12px border radius, soft teal shadow, and dark mode support.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

function Card({ children, style, elevated = false }) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.card,
          padding: spacing.base,
        },
        elevated ? shadows.cardElevated : shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

export default Card;
