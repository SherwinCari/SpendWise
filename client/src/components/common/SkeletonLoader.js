/**
 * SkeletonLoader Component (Feature #13)
 * Animated pulsing placeholder for loading states.
 * Provides transaction-card and dashboard skeletons.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Single skeleton block with pulse animation.
 */
function SkeletonBlock({ width, height = 16, borderRadius = 4, style }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width || '100%',
          height,
          borderRadius,
          backgroundColor: colors.textSecondary + '20',
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for a transaction card.
 */
export function TransactionSkeleton() {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  return (
    <View style={[styles.transactionCard, { backgroundColor: colors.card, borderRadius: borderRadius.card, ...shadows.card, margin: spacing.xs, marginHorizontal: spacing.base, padding: spacing.md }]}>
      <SkeletonBlock width={40} height={40} borderRadius={10} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="40%" height={10} style={{ marginTop: 8 }} />
      </View>
      <SkeletonBlock width={60} height={14} />
    </View>
  );
}

/**
 * Skeleton for the dashboard balance section.
 */
export function DashboardSkeleton() {
  const { spacing } = useTheme();

  return (
    <View style={[styles.dashboardSkeleton, { padding: spacing.base }]}>
      {/* Balance */}
      <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <SkeletonBlock width={100} height={12} />
        <SkeletonBlock width={180} height={28} style={{ marginTop: 8 }} borderRadius={6} />
      </View>

      {/* Summary cards */}
      <View style={[styles.summaryRow, { marginTop: spacing.lg }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <SkeletonBlock height={80} borderRadius={12} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <SkeletonBlock height={80} borderRadius={12} />
        </View>
      </View>

      {/* Quick actions */}
      <View style={[styles.summaryRow, { marginTop: spacing.lg }]}>
        <SkeletonBlock width="48%" height={44} borderRadius={8} />
        <SkeletonBlock width="48%" height={44} borderRadius={8} />
      </View>

      {/* Transaction skeletons */}
      <View style={{ marginTop: spacing.lg }}>
        <SkeletonBlock width={140} height={16} style={{ marginBottom: 12 }} />
        {[1, 2, 3, 4].map((i) => (
          <TransactionSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

export default SkeletonBlock;

const styles = StyleSheet.create({
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardSkeleton: {},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
