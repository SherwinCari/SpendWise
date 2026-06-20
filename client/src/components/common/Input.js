/**
 * SpendWise Input Component
 * Text input with label, error state, and 8px border radius.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  editable = true,
  style,
  inputStyle,
  ...rest
}) {
  const { colors, spacing, borderRadius, typography, fontSize, fontWeight } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.expense;
    if (isFocused) return colors.primary;
    return colors.textSecondary + '40'; // 25% opacity
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            typography.label,
            { color: colors.textPrimary, marginBottom: spacing.xs },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: getBorderColor(),
            borderRadius: borderRadius.input,
            color: colors.textPrimary,
            fontSize: fontSize.base,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.base,
          },
          multiline && styles.multiline,
          !editable && { opacity: 0.6 },
          inputStyle,
        ]}
        accessibilityLabel={label || placeholder}
        accessibilityState={{ disabled: !editable }}
        {...rest}
      />
      {error && (
        <Text
          style={[
            styles.error,
            typography.caption,
            { color: colors.expense, marginTop: spacing.xs },
          ]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {},
  input: {
    borderWidth: 1.5,
    minHeight: 48,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {},
});

export default Input;
