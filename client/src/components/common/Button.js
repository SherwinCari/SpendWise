/**
 * SpendWise Button Component
 * Reusable button with primary, secondary, and danger variants.
 * Uses 8px border radius and teal shadow from theme.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';

function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case 'secondary':
        return 'transparent';
      case 'danger':
        return colors.expense;
      case 'primary':
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled && variant === 'secondary') return colors.textSecondary;
    switch (variant) {
      case 'secondary':
        return colors.primary;
      case 'danger':
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const getBorderStyle = () => {
    if (variant === 'secondary') {
      return {
        borderWidth: 1.5,
        borderColor: disabled ? colors.textSecondary : colors.primary,
      };
    }
    return {};
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: borderRadius.button,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        !disabled && variant !== 'secondary' && shadows.button,
        getBorderStyle(),
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            typography.label,
            { color: getTextColor() },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    textAlign: 'center',
  },
});

export default Button;
