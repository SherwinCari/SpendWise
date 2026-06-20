/**
 * SpendWise EmptyState Component
 * Illustration placeholder + message for empty lists.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

function EmptyState({ title, message, icon, action, style }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, style]} accessibilityRole="text">
      {icon && (
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.primary + '15',
              marginBottom: spacing.base,
            },
          ]}
        >
          <Text style={[styles.icon, { color: colors.primary }]}>{icon}</Text>
        </View>
      )}
      {!icon && (
        <View
          style={[
            styles.placeholder,
            {
              backgroundColor: colors.primary + '10',
              borderColor: colors.primary + '30',
              marginBottom: spacing.base,
            },
          ]}
        >
          <Text style={[styles.placeholderIcon, { color: colors.primary }]}>
            📋
          </Text>
        </View>
      )}
      {title && (
        <Text
          style={[
            typography.h3,
            { color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
      )}
      {message && (
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },
          ]}
        >
          {message}
        </Text>
      )}
      {action && <View style={{ marginTop: spacing.lg }}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 36,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
});

export default EmptyState;
