/**
 * BalanceWidget (Feature #25)
 * Home screen widget placeholder for Android.
 * 
 * NOTE: This requires `react-native-android-widget` which needs a dev build
 * using `eas build`. This file serves as the widget component definition.
 * 
 * To enable:
 * 1. Install: npx expo install react-native-android-widget
 * 2. Add to app.json plugins: ["react-native-android-widget"]
 * 3. Run: eas build --platform android --profile development
 * 4. Register the widget in the app entry point
 * 
 * Widget displays:
 * - Total balance across all wallets
 * - Today's spending total
 * - Quick action to add expense
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Widget component rendered by react-native-android-widget.
 * Uses a simplified layout (no theming available in widget context).
 */
export function BalanceWidgetComponent({ totalBalance = 0, todaySpending = 0 }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quorax</Text>
      <Text style={styles.balanceLabel}>Total Balance</Text>
      <Text style={styles.balanceAmount}>
        ₱{parseFloat(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
      <View style={styles.divider} />
      <Text style={styles.spendingLabel}>Today's Spending</Text>
      <Text style={styles.spendingAmount}>
        -₱{parseFloat(todaySpending).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

/**
 * Widget task handler — would be registered with react-native-android-widget.
 * 
 * Example registration (in index.js or widget task file):
 * 
 * import { registerWidgetTaskHandler } from 'react-native-android-widget';
 * import { BalanceWidgetComponent } from './src/widgets/BalanceWidget';
 * 
 * registerWidgetTaskHandler(async (props) => {
 *   // Fetch balance data from API or local storage
 *   // Return the rendered widget
 *   return <BalanceWidgetComponent totalBalance={balance} todaySpending={spending} />;
 * });
 */

// Widget configuration for Android
export const WIDGET_CONFIG = {
  name: 'Quorax Balance',
  description: 'Shows your total balance and today\'s spending',
  minWidth: '250dp',
  minHeight: '100dp',
  previewImage: null, // Would point to a preview image asset
  updatePeriodMillis: 1800000, // 30 minutes
};

export default BalanceWidgetComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0D9488',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  spendingLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  spendingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 2,
  },
});
