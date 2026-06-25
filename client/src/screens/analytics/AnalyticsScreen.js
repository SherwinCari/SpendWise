/**
 * SpendWise Analytics Screen
 * Displays monthly summary, category breakdown pie chart, and spending trends line chart.
 * Includes period selectors and empty states when no data is available.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../theme/ThemeContext';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { getMonthlySummary, getCategoryBreakdown, getSpendingTrends } from '../../api/analyticsApi';
import { apiClient } from '../../api/client';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48; // 24px padding on each side

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULT_CATEGORY_COLORS = [
  '#0D9488', '#F59E0B', '#EF4444', '#10B981', '#6366F1',
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4',
];

export default function AnalyticsScreen() {
  const { colors, spacing, typography, isDark, borderRadius } = useTheme();

  // Period state for monthly summary
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Period state for category breakdown
  const [breakdownStartDate, setBreakdownStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [breakdownEndDate, setBreakdownEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data states
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendsData, setTrendsData] = useState(null);

  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);

  // Error states
  const [summaryError, setSummaryError] = useState(null);
  const [breakdownError, setBreakdownError] = useState(null);
  const [trendsError, setTrendsError] = useState(null);

  // Fetch monthly summary
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const response = await getMonthlySummary(selectedYear, selectedMonth);
      // Server returns { success: true, totalIncome, totalExpenses, netBalance }
      // (data spread directly into response body)
      const respData = response.data;
      setSummary(respData?.data || respData);
    } catch (error) {
      setSummaryError('Failed to load monthly summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch category breakdown
  const fetchBreakdown = useCallback(async () => {
    setLoadingBreakdown(true);
    setBreakdownError(null);
    try {
      const response = await getCategoryBreakdown(breakdownStartDate, breakdownEndDate);
      // Server returns { success: true, breakdown: [...] }
      const data = response.data?.breakdown || response.data?.data || response.data || [];
      setCategoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      setBreakdownError('Failed to load category breakdown');
    } finally {
      setLoadingBreakdown(false);
    }
  }, [breakdownStartDate, breakdownEndDate]);

  // Fetch spending trends
  const fetchTrends = useCallback(async () => {
    setLoadingTrends(true);
    setTrendsError(null);
    try {
      const response = await getSpendingTrends();
      // Server returns { success: true, trends: [...] }
      const data = response.data?.trends || response.data?.data || response.data;
      setTrendsData(Array.isArray(data) ? data : null);
    } catch (error) {
      setTrendsError('Failed to load spending trends');
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Navigate months
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Update breakdown date range when month changes
  const updateBreakdownRange = (monthOffset) => {
    const d = new Date(selectedYear, selectedMonth - 1 + monthOffset, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setBreakdownStartDate(start.toISOString().split('T')[0]);
    setBreakdownEndDate(end.toISOString().split('T')[0]);
  };

  // Check if summary has data
  const hasSummaryData = summary && (
    parseFloat(summary.totalIncome || summary.total_income || '0') > 0 ||
    parseFloat(summary.totalExpenses || summary.total_expenses || '0') > 0
  );

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) {
      return [];
    }
    return categoryData
      .filter(item => parseFloat(item.total || item.amount || '0') > 0)
      .map((item, index) => ({
        name: item.categoryName || item.category_name || item.name || 'Other',
        amount: parseFloat(item.total || item.amount || '0'),
        color: item.categoryColor || item.color || DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      }));
  }, [categoryData, colors.textSecondary]);

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    if (!trendsData || !Array.isArray(trendsData) || trendsData.length === 0) {
      return null;
    }
    const labels = trendsData.map(item => {
      const monthIndex = (item.month || item.monthNumber || 1) - 1;
      return MONTHS[monthIndex]?.substring(0, 3) || '';
    });
    const data = trendsData.map(item =>
      parseFloat(item.totalExpenses || item.total_expenses || item.total || '0')
    );
    return { labels, datasets: [{ data }] };
  }, [trendsData]);

  const chartBackgroundColor = isDark ? '#1E293B' : '#FFFFFF';

  const formatCurrency = (value) => {
    const num = parseFloat(value || '0');
    return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
        Analytics
      </Text>

      {/* Monthly Summary Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Monthly Summary
        </Text>

        {/* Month/Year Picker */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            onPress={goToPreviousMonth}
            style={[styles.arrowButton, { backgroundColor: colors.primary + '15' }]}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Text style={[styles.arrowText, { color: colors.primary }]}>◀</Text>
          </TouchableOpacity>
          <Text style={[styles.periodText, { color: colors.textPrimary }]}>
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.arrowButton, { backgroundColor: colors.primary + '15' }]}
            accessibilityLabel="Next month"
            accessibilityRole="button"
          >
            <Text style={[styles.arrowText, { color: colors.primary }]}>▶</Text>
          </TouchableOpacity>
        </View>

        {loadingSummary ? (
          <LoadingSpinner message="Loading summary..." />
        ) : summaryError ? (
          <EmptyState
            icon="⚠️"
            title="Error"
            message={summaryError}
          />
        ) : !hasSummaryData ? (
          <EmptyState
            icon="📊"
            title="No data"
            message="No transactions found for this period"
          />
        ) : (
          <View style={styles.summaryCards}>
            {/* Income Card */}
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Income
              </Text>
              <Text style={[styles.summaryAmount, { color: colors.income }]}>
                {formatCurrency(summary.totalIncome || summary.total_income)}
              </Text>
            </Card>

            {/* Expense Card */}
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Expenses
              </Text>
              <Text style={[styles.summaryAmount, { color: colors.expense }]}>
                {formatCurrency(summary.totalExpenses || summary.total_expenses)}
              </Text>
            </Card>

            {/* Net Balance Card */}
            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                Net Balance
              </Text>
              <Text
                style={[
                  styles.summaryAmount,
                  {
                    color: parseFloat(summary.netBalance || summary.net_balance || '0') >= 0
                      ? colors.income
                      : colors.expense,
                  },
                ]}
              >
                {formatCurrency(summary.netBalance || summary.net_balance)}
              </Text>
            </Card>
          </View>
        )}
      </View>

      {/* Category Breakdown Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Category Breakdown
        </Text>

        {/* Date Range Selector */}
        <View style={styles.dateRangeRow}>
          <View style={[styles.dateChip, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.dateChipLabel, { color: colors.textSecondary }]}>From</Text>
            <Text style={[styles.dateChipValue, { color: colors.textPrimary }]}>
              {breakdownStartDate}
            </Text>
          </View>
          <View style={[styles.dateChip, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.dateChipLabel, { color: colors.textSecondary }]}>To</Text>
            <Text style={[styles.dateChipValue, { color: colors.textPrimary }]}>
              {breakdownEndDate}
            </Text>
          </View>
        </View>

        {loadingBreakdown ? (
          <LoadingSpinner message="Loading breakdown..." />
        ) : breakdownError ? (
          <EmptyState
            icon="⚠️"
            title="Error"
            message={breakdownError}
          />
        ) : pieChartData.length === 0 ? (
          <EmptyState
            icon="🥧"
            title="No spending data"
            message="No category spending found for the selected date range"
          />
        ) : (
          <Card style={styles.chartCard}>
            <PieChart
              data={pieChartData}
              width={CHART_WIDTH - 32}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
                labelColor: () => colors.textSecondary,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute
              hasLegend={true}
            />
          </Card>
        )}
      </View>

      {/* Spending Trends Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Spending Trends
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Monthly expenses for the last 6 months
        </Text>

        {loadingTrends ? (
          <LoadingSpinner message="Loading trends..." />
        ) : trendsError ? (
          <EmptyState
            icon="⚠️"
            title="Error"
            message={trendsError}
          />
        ) : !lineChartData ? (
          <EmptyState
            icon="📈"
            title="No trends data"
            message="Not enough transaction history to show spending trends"
          />
        ) : (
          <Card style={styles.chartCard}>
            <LineChart
              data={lineChartData}
              width={CHART_WIDTH - 32}
              height={220}
              yAxisLabel="₱"
              chartConfig={{
                backgroundColor: chartBackgroundColor,
                backgroundGradientFrom: chartBackgroundColor,
                backgroundGradientTo: chartBackgroundColor,
                decimalCount: 0,
                color: (opacity = 1) => `rgba(13, 148, 136, ${opacity})`,
                labelColor: () => colors.textSecondary,
                style: { borderRadius: 12 },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#0D9488',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              }}
              bezier
              style={{
                borderRadius: 12,
              }}
            />
          </Card>
        )}
      </View>

      {/* Generate Monthly Report (Feature #24) */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.reportButton, { backgroundColor: colors.primary, borderRadius: 8 }]}
          onPress={async () => {
            try {
              const response = await apiClient.post('/notifications/monthly-summary');
              Alert.alert('Report Generated', response.data?.data?.message || 'Monthly summary notification created!');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error?.message || 'Failed to generate report.');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Generate Monthly Report"
        >
          <Text style={styles.reportButtonText}>📊 Generate Monthly Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  summaryCards: {
    gap: 12,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateChipLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateChipValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartCard: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  reportButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
