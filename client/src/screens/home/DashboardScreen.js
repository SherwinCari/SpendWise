/**
 * DashboardScreen
 * Main home screen displaying financial overview:
 * - Total balance across all wallets
 * - Monthly income/expense summary cards
 * - Quick action buttons (Add Income / Add Expense)
 * - Recent transactions (last 5)
 * - Budget alerts for budgets approaching/exceeding limits
 * - Pull-to-refresh support
 *
 * Requirements: 10.2, 13.1, 9.1, 9.2, 9.3
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useWallets } from '../../context/WalletContext';
import { useTransactions } from '../../context/TransactionContext';
import { useBudgets } from '../../context/BudgetContext';
import { useNotifications } from '../../context/NotificationContext';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import TransactionCard from '../../components/transactions/TransactionCard';
import { DashboardSkeleton } from '../../components/common/SkeletonLoader';
import * as analyticsApi from '../../api/analyticsApi';

export default function DashboardScreen() {
  const { colors, spacing, borderRadius, shadows, typography, fontSize, fontWeight } = useTheme();
  const navigation = useNavigation();
  const { wallets, fetchWallets } = useWallets();
  const { transactions, fetchTransactions } = useTransactions();
  const { budgets, fetchBudgets } = useBudgets();
  const { fetchNotifications } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState({
    totalIncome: '0',
    totalExpenses: '0',
  });
  const [insights, setInsights] = useState([]);

  // Calculate total balance across all wallets
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, wallet) => sum + (parseFloat(wallet.balance) || 0), 0);
  }, [wallets]);

  // Get the last 5 transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Identify budgets approaching or exceeding limits
  const budgetAlerts = useMemo(() => {
    return budgets
      .map((budget) => {
        const spent = parseFloat(budget.spent) || 0;
        const limit = parseFloat(budget.amountLimit) || 1;
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        return { ...budget, percentage };
      })
      .filter((budget) => budget.percentage >= 50)
      .sort((a, b) => b.percentage - a.percentage);
  }, [budgets]);

  // Fetch monthly summary from analytics API
  const fetchMonthlySummary = useCallback(async () => {
    try {
      const now = new Date();
      const response = await analyticsApi.getMonthlySummary(
        now.getFullYear(),
        now.getMonth() + 1
      );
      const data = response.data?.summary || response.data || {};
      setMonthlySummary({
        totalIncome: data.totalIncome || data.total_income || '0',
        totalExpenses: data.totalExpenses || data.total_expenses || '0',
      });
    } catch {
      // Silently fail — dashboard still shows other data
    }
  }, []);

  // Fetch AI insights (Feature #26)
  const fetchInsights = useCallback(async () => {
    try {
      const response = await analyticsApi.getInsights();
      setInsights(response.data?.data || []);
    } catch {
      // Silently fail
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadError(null);
    try {
      // Use Promise.allSettled so one failing request doesn't block others
      await Promise.allSettled([
        fetchWallets(),
        fetchTransactions({ page: 1, limit: 5 }),
        fetchBudgets(),
        fetchNotifications(),
        fetchMonthlySummary(),
        fetchInsights(),
      ]);
    } catch (err) {
      if (err?.message === 'Network Error' || !err?.response) {
        setLoadError('No internet connection. Pull down to retry.');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Format currency amount
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get budget alert indicator color
  const getBudgetAlertColor = (percentage) => {
    if (percentage >= 100) return colors.expense; // Red — exceeded
    if (percentage >= 75) return colors.expense;  // Red — critical
    return colors.accent;                         // Gold — approaching
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, flex: 1 }]}>
        <DashboardSkeleton />
      </View>
    );
  }

  if (loadError && wallets.length === 0 && transactions.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { flex: 1, justifyContent: 'center' }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <EmptyState
          icon="📡"
          title="No Connection"
          message={loadError}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Total Balance Section */}
      <View style={[styles.balanceSection, { paddingHorizontal: spacing.base, paddingTop: spacing.lg }]}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
          Total Balance
        </Text>
        <Text
          style={[styles.balanceAmount, { color: colors.primary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }]}
          accessibilityLabel={`Total balance ${formatCurrency(totalBalance)}`}
        >
          {formatCurrency(totalBalance)}
        </Text>
      </View>

      {/* Income / Expense Summary Cards */}
      <View style={[styles.summaryRow, { paddingHorizontal: spacing.base, marginTop: spacing.base }]}>
        <Card style={[styles.summaryCard, { marginRight: spacing.sm }]}>
          <View style={styles.summaryCardContent}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.income}15` }]}>
              <Icon name="arrow-down-circle" size={20} color={colors.income} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              Income
            </Text>
            <Text
              style={[styles.summaryAmount, { color: colors.income, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}
              numberOfLines={1}
            >
              {formatCurrency(monthlySummary.totalIncome)}
            </Text>
          </View>
        </Card>

        <Card style={[styles.summaryCard, { marginLeft: spacing.sm }]}>
          <View style={styles.summaryCardContent}>
            <View style={[styles.summaryIcon, { backgroundColor: `${colors.expense}15` }]}>
              <Icon name="arrow-up-circle" size={20} color={colors.expense} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              Expenses
            </Text>
            <Text
              style={[styles.summaryAmount, { color: colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}
              numberOfLines={1}
            >
              {formatCurrency(monthlySummary.totalExpenses)}
            </Text>
          </View>
        </Card>
      </View>

      {/* Quick Action Buttons */}
      <View style={[styles.quickActions, { paddingHorizontal: spacing.base, marginTop: spacing.lg }]}>
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            {
              backgroundColor: colors.income,
              borderRadius: borderRadius.button,
              ...shadows.button,
            },
          ]}
          onPress={() =>
            navigation.navigate('Transactions', {
              screen: 'AddEditTransaction',
              params: { type: 'income' },
            })
          }
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add Income"
        >
          <Icon name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Add Income</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickActionButton,
            {
              backgroundColor: colors.expense,
              borderRadius: borderRadius.button,
              ...shadows.button,
            },
          ]}
          onPress={() =>
            navigation.navigate('Transactions', {
              screen: 'AddEditTransaction',
              params: { type: 'expense' },
            })
          }
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add Expense"
        >
          <Icon name="minus" size={18} color="#FFFFFF" />
          <Text style={styles.quickActionText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={[styles.section, { marginTop: spacing.lg }]}>
        <View style={[styles.sectionHeader, { paddingHorizontal: spacing.base }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>
            Recent Transactions
          </Text>
          {transactions.length > 5 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Transactions', { screen: 'TransactionList' })}
              accessibilityRole="button"
              accessibilityLabel="See all transactions"
            >
              <Text style={[styles.seeAll, { color: colors.primary, fontSize: fontSize.sm }]}>
                See All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onPress={() =>
                navigation.navigate('Transactions', {
                  screen: 'TransactionDetails',
                  params: { transactionId: transaction.id },
                })
              }
            />
          ))
        ) : (
          <View style={[styles.emptyState, { paddingHorizontal: spacing.base }]}>
            <Icon name="receipt" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
              No transactions yet
            </Text>
          </View>
        )}
      </View>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <View style={[styles.section, { marginTop: spacing.lg, marginBottom: spacing.lg }]}>
          <View style={[styles.sectionHeader, { paddingHorizontal: spacing.base }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>
              Budget Alerts
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Budgets', { screen: 'BudgetList' })}
              accessibilityRole="button"
              accessibilityLabel="See all budgets"
            >
              <Text style={[styles.seeAll, { color: colors.primary, fontSize: fontSize.sm }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {budgetAlerts.map((budget) => (
            <View
              key={budget.id}
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.card,
                  marginHorizontal: spacing.base,
                  marginVertical: spacing.xs,
                  padding: spacing.md,
                  ...shadows.card,
                },
              ]}
            >
              <View style={styles.alertRow}>
                <View style={[styles.alertIndicator, { backgroundColor: getBudgetAlertColor(budget.percentage) }]} />
                <View style={styles.alertContent}>
                  <Text
                    style={[styles.alertCategory, { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}
                    numberOfLines={1}
                  >
                    {budget.categoryName || 'Budget'}
                  </Text>
                  <Text style={[styles.alertDetail, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                    {Math.round(budget.percentage)}% used — {formatCurrency(budget.spent || 0)} of {formatCurrency(budget.amountLimit || 0)}
                  </Text>
                </View>
                <Icon
                  name={budget.percentage >= 100 ? 'alert-circle' : 'alert'}
                  size={20}
                  color={getBudgetAlertColor(budget.percentage)}
                />
              </View>

              {/* Progress bar */}
              <View style={[styles.alertProgress, { backgroundColor: colors.background, borderRadius: 4, marginTop: spacing.sm }]}>
                <View
                  style={[
                    styles.alertProgressFill,
                    {
                      backgroundColor: getBudgetAlertColor(budget.percentage),
                      borderRadius: 4,
                      width: `${Math.min(budget.percentage, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* AI Insights (Feature #26) */}
      {insights.length > 0 && (
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <View style={[styles.sectionHeader, { paddingHorizontal: spacing.base }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>
              💡 Insights
            </Text>
          </View>
          {insights.slice(0, 2).map((insight, index) => (
            <View
              key={index}
              style={[
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.card,
                  marginHorizontal: spacing.base,
                  marginVertical: spacing.xs,
                  padding: spacing.md,
                  ...shadows.card,
                  borderLeftWidth: 3,
                  borderLeftColor: insight.severity === 'warning' ? colors.expense
                    : insight.severity === 'success' ? colors.income
                    : colors.primary,
                },
              ]}
            >
              <Text style={[{ color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20 }]}>
                {insight.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom spacing */}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 16,
  },
  // Balance section
  balanceSection: {
    alignItems: 'center',
  },
  balanceLabel: {
    marginBottom: 4,
  },
  balanceAmount: {
    marginTop: 4,
  },
  // Summary cards
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCard: {
    flex: 1,
  },
  summaryCardContent: {
    alignItems: 'flex-start',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryAmount: {},
  // Quick actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Section
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {},
  seeAll: {},
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
  },
  // Budget alerts
  alertCard: {},
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
    marginRight: 8,
  },
  alertCategory: {},
  alertDetail: {
    marginTop: 2,
  },
  alertProgress: {
    height: 6,
    overflow: 'hidden',
  },
  alertProgressFill: {
    height: '100%',
  },
});
