/**
 * DashboardScreen
 * Main home screen displaying financial overview:
 * - Total balance across all wallets
 * - Monthly income/expense summary cards
 * - Quick action buttons (Add Income / Add Expense)
 * - Weekly summary card (Feature 12)
 * - Spending streak (Feature 11)
 * - Biggest expense badge (Feature 14)
 * - Average daily spending (Feature 15)
 * - Recent transactions (last 5)
 * - Budget alerts for budgets approaching/exceeding limits
 * - Pull-to-refresh support
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
import { useCurrency, formatCurrency as formatCurrencyUtil } from '../../utils/currency';
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
  const { currency } = useCurrency();

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

  // ─── Feature 12: Weekly Summary ───────────────────────────────────────
  const weeklySummary = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= weekAgo && d <= now && t.type === 'expense';
    });

    const totalSpent = weekTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const count = weekTransactions.length;

    // Top category
    const categoryCount = {};
    weekTransactions.forEach((t) => {
      const cat = t.categoryName || 'Other';
      categoryCount[cat] = (categoryCount[cat] || 0) + (parseFloat(t.amount) || 0);
    });
    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];

    return { totalSpent, count, topCategory: topCategory ? topCategory[0] : null };
  }, [transactions]);

  // ─── Feature 11: Spending Streak ──────────────────────────────────────
  const spendingStreak = useMemo(() => {
    if (transactions.length === 0) return null;

    // Find top spending category
    const categorySpending = {};
    transactions.filter(t => t.type === 'expense').forEach((t) => {
      const cat = t.categoryName || 'Other';
      categorySpending[cat] = (categorySpending[cat] || 0) + (parseFloat(t.amount) || 0);
    });

    const topCat = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
    if (!topCat) return null;

    const targetCategory = topCat[0];

    // Calculate streak of days without spending in that category
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasExpense = transactions.some(
        (t) => t.type === 'expense' && t.categoryName === targetCategory && t.date?.split('T')[0] === dateStr
      );
      if (hasExpense) break;
      streak++;
    }

    return streak > 0 ? { days: streak, category: targetCategory } : null;
  }, [transactions]);

  // ─── Feature 14: Biggest Expense Badge ────────────────────────────────
  const biggestExpense = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpenses = transactions.filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= monthStart && d <= now;
    });

    if (monthExpenses.length === 0) return null;

    return monthExpenses.reduce((max, t) => {
      const amount = parseFloat(t.amount) || 0;
      return amount > (parseFloat(max.amount) || 0) ? t : max;
    }, monthExpenses[0]);
  }, [transactions]);

  // ─── Feature 15: Average Daily Spending ───────────────────────────────
  const avgDailySpending = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = Math.max(1, Math.ceil((now - monthStart) / (1000 * 60 * 60 * 24)));

    const monthExpenses = transactions.filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= monthStart && d <= now;
    });

    const totalSpent = monthExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    return totalSpent / daysElapsed;
  }, [transactions]);

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

  // Fetch AI insights
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
      await Promise.allSettled([
        fetchWallets(),
        fetchTransactions({ page: 1, limit: 50 }),
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

  // Format currency amount using user preference
  const fmtCurrency = (amount) => formatCurrencyUtil(amount, currency);

  // Get budget alert indicator color
  const getBudgetAlertColor = (percentage) => {
    if (percentage >= 100) return colors.expense;
    if (percentage >= 75) return colors.expense;
    return colors.accent;
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
          accessibilityLabel={`Total balance ${fmtCurrency(totalBalance)}`}
        >
          {fmtCurrency(totalBalance)}
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
              {fmtCurrency(monthlySummary.totalIncome)}
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
              {fmtCurrency(monthlySummary.totalExpenses)}
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

      {/* ─── Feature 12: Weekly Summary Card ─────────────────────────────── */}
      {weeklySummary.count > 0 && (
        <Card style={[styles.insightCard, { marginHorizontal: spacing.base, marginTop: spacing.lg }]}>
          <View style={styles.insightRow}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: colors.textPrimary, fontWeight: fontWeight.semiBold, fontSize: fontSize.sm }]}>
                Weekly Summary
              </Text>
              <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 }]}>
                This week you spent {fmtCurrency(weeklySummary.totalSpent)} on {weeklySummary.count} transaction{weeklySummary.count !== 1 ? 's' : ''}.
                {weeklySummary.topCategory ? ` Top category: ${weeklySummary.topCategory}` : ''}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* ─── Feature 11: Spending Streak ─────────────────────────────────── */}
      {spendingStreak && spendingStreak.days > 1 && (
        <Card style={[styles.insightCard, { marginHorizontal: spacing.base, marginTop: spacing.sm }]}>
          <View style={styles.insightRow}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: colors.textPrimary, fontWeight: fontWeight.semiBold, fontSize: fontSize.sm }]}>
                Spending Streak
              </Text>
              <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 }]}>
                {spendingStreak.days} day{spendingStreak.days !== 1 ? 's' : ''} without spending on {spendingStreak.category}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* ─── Feature 14: Biggest Expense Badge ───────────────────────────── */}
      {biggestExpense && (
        <Card style={[styles.insightCard, { marginHorizontal: spacing.base, marginTop: spacing.sm }]}>
          <View style={styles.insightRow}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>💸</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: colors.textPrimary, fontWeight: fontWeight.semiBold, fontSize: fontSize.sm }]}>
                Biggest Expense
              </Text>
              <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 }]}>
                {fmtCurrency(biggestExpense.amount)} on {biggestExpense.description || biggestExpense.categoryName || 'expense'}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* ─── Feature 15: Average Daily Spending ──────────────────────────── */}
      {avgDailySpending > 0 && (
        <Card style={[styles.insightCard, { marginHorizontal: spacing.base, marginTop: spacing.sm }]}>
          <View style={styles.insightRow}>
            <Text style={{ fontSize: 20, marginRight: 10 }}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: colors.textPrimary, fontWeight: fontWeight.semiBold, fontSize: fontSize.sm }]}>
                Average Daily Spending
              </Text>
              <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18, marginTop: 2 }]}>
                {fmtCurrency(avgDailySpending)} per day this month
              </Text>
            </View>
          </View>
        </Card>
      )}

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
                    {Math.round(budget.percentage)}% used — {fmtCurrency(budget.spent || 0)} of {fmtCurrency(budget.amountLimit || 0)}
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

      {/* AI Insights */}
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
  // Insight cards
  insightCard: {},
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightTitle: {},
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
