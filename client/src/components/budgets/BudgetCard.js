/**
 * BudgetCard Component
 * Displays category name, progress bar (teal→gold→red), spent/limit amounts, and percentage.
 * Color logic:
 *   - Teal (primary): percentage < 50%
 *   - Gold (accent): percentage >= 50% and < 75%
 *   - Red (expense): percentage >= 75%
 * Requirements: 8.1, 8.5
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

function BudgetCard({ budget, onPress }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  const spent = parseFloat(budget?.spent) || 0;
  const limit = parseFloat(budget?.amountLimit) || 1;
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  // Determine progress bar color based on percentage thresholds
  const getProgressColor = (pct) => {
    if (pct >= 75) return colors.expense;    // Red
    if (pct >= 50) return colors.accent;     // Gold
    return colors.primary;                    // Teal
  };

  const progressColor = getProgressColor(percentage);
  const progressWidth = Math.min(percentage, 100); // Cap visual at 100%

  const formatAmount = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.card,
          padding: spacing.base,
          ...shadows.card,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${budget?.categoryName || 'Budget'}, ${percentage}% spent, ${formatAmount(spent)} of ${formatAmount(limit)}`}
    >
      {/* Header: category name + percentage */}
      <View style={[styles.header, { marginBottom: spacing.sm }]}>
        <Text
          style={[typography.label, { color: colors.textPrimary, flex: 1 }]}
          numberOfLines={1}
        >
          {budget?.categoryName || 'Uncategorized'}
        </Text>
        <Text
          style={[
            typography.label,
            { color: progressColor },
          ]}
        >
          {percentage}%
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: colors.background,
            borderRadius: borderRadius.button,
            height: 8,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: progressColor,
              borderRadius: borderRadius.button,
              width: `${progressWidth}%`,
            },
          ]}
        />
      </View>

      {/* Spent / Limit amounts */}
      <View style={styles.footer}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          ₱{formatAmount(spent)} spent
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          ₱{formatAmount(limit)} limit
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default BudgetCard;
