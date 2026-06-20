/**
 * WalletCard Component
 * Displays wallet name, formatted balance, and accent color indicator.
 * Requirements: 10.1, 10.2
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

function WalletCard({ wallet, onPress }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  const formatBalance = (balance) => {
    const num = parseFloat(balance) || 0;
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const accentColor = wallet?.color || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.card,
          padding: spacing.base,
          ...shadows.card,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${wallet?.name || 'Wallet'}, balance ${formatBalance(wallet?.balance)}`}
    >
      {/* Accent color indicator */}
      <View
        style={[
          styles.accentIndicator,
          {
            backgroundColor: accentColor,
            borderRadius: borderRadius.button,
          },
        ]}
      />

      <View style={[styles.content, { marginLeft: spacing.md }]}>
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, marginBottom: spacing.xs },
          ]}
          numberOfLines={1}
        >
          {wallet?.name || 'Wallet'}
        </Text>

        <Text
          style={[
            typography.h3,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {formatBalance(wallet?.balance)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentIndicator: {
    width: 4,
    height: '100%',
    minHeight: 40,
  },
  content: {
    flex: 1,
  },
});

export default WalletCard;
