/**
 * TransactionListScreen
 * Displays a paginated list of transactions with infinite scroll,
 * filter bar, pull-to-refresh, and empty state.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 16.3
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { apiClient } from '../../api/client';
import TransactionCard from '../../components/transactions/TransactionCard';
import FilterBar from '../../components/transactions/FilterBar';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PAGE_SIZE = 20;

export default function TransactionListScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const { transactions, total, fetchTransactions, loading } = useTransactions();
  const { allCategories, fetchCategories } = useCategories();

  const [localTransactions, setLocalTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const isFetchingRef = useRef(false);

  // Export CSV (Feature #18)
  const handleExportCSV = useCallback(async () => {
    try {
      const now = new Date();
      const startDate = filters.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = filters.endDate || now.toISOString().split('T')[0];

      const response = await apiClient.get('/transactions/export', {
        params: { startDate, endDate, format: 'csv' },
        responseType: 'text',
      });

      const csv = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const fileUri = `${FileSystem.documentDirectory}transactions_${startDate}_${endDate}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Transactions' });
      } else {
        Alert.alert('Exported', `CSV saved to: ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Export Failed', err.response?.data?.error?.message || 'Could not export transactions.');
    }
  }, [filters]);

  // Fetch categories on mount for the filter bar
  useEffect(() => {
    fetchCategories().catch(() => {});
  }, [fetchCategories]);

  // Fetch transactions when filters change (reset to page 1)
  useEffect(() => {
    loadTransactions(1, true);
  }, [filters]);

  /**
   * Core fetch function
   * @param {number} pageNum - Page number to fetch
   * @param {boolean} reset - If true, replace existing transactions
   */
  const loadTransactions = useCallback(async (pageNum, reset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const queryFilters = {
        page: pageNum,
        limit: PAGE_SIZE,
        ...buildApiFilters(filters),
      };

      const result = await fetchTransactions(queryFilters);
      const fetched = result?.transactions || [];
      const totalCount = result?.total || 0;

      if (reset) {
        setLocalTransactions(fetched);
      } else {
        setLocalTransactions((prev) => [...prev, ...fetched]);
      }

      setPage(pageNum);
      setHasMore(pageNum * PAGE_SIZE < totalCount);
    } catch {
      // Error is handled in context
    } finally {
      isFetchingRef.current = false;
      setInitialLoad(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [fetchTransactions, filters]);

  /**
   * Pull-to-refresh handler
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(1, true);
  }, [loadTransactions]);

  /**
   * Infinite scroll — load next page when end reached
   */
  const handleEndReached = useCallback(() => {
    if (loadingMore || !hasMore || isFetchingRef.current) return;
    setLoadingMore(true);
    loadTransactions(page + 1, false);
  }, [loadingMore, hasMore, page, loadTransactions]);

  /**
   * Navigate to transaction details on card press
   */
  const handleTransactionPress = useCallback((transaction) => {
    navigation.navigate('TransactionDetails', { transactionId: transaction.id });
  }, [navigation]);

  /**
   * Handle filter change from FilterBar
   */
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setLocalTransactions([]);
    setHasMore(true);
    setInitialLoad(true);
  }, []);

  /**
   * Render individual transaction item
   */
  const renderItem = useCallback(({ item }) => (
    <TransactionCard
      transaction={item}
      onPress={() => handleTransactionPress(item)}
    />
  ), [handleTransactionPress]);

  /**
   * Render footer with loading indicator for infinite scroll
   */
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors.primary]);

  /**
   * Render empty state when no transactions found
   */
  const renderEmpty = useCallback(() => {
    if (initialLoad || loading) return null;

    const hasActiveFilters = Object.keys(filters).some(
      (key) => filters[key] !== undefined && filters[key] !== '' && filters[key] !== null
    );

    return (
      <EmptyState
        icon="📊"
        title={hasActiveFilters ? 'No matching transactions' : 'No transactions yet'}
        message={
          hasActiveFilters
            ? 'Try adjusting your filters to find what you\'re looking for.'
            : 'Start tracking your finances by adding your first transaction.'
        }
      />
    );
  }, [initialLoad, loading, filters]);

  /**
   * Render the filter bar header with export button
   */
  const renderHeader = useCallback(() => (
    <View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => navigation.navigate('CalendarView')}
          accessibilityRole="button"
          accessibilityLabel="View calendar"
        >
          <Icon name="calendar-month" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportCSV}
          accessibilityRole="button"
          accessibilityLabel="Export transactions to CSV"
        >
          <Icon name="download" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        categories={allCategories}
      />
    </View>
  ), [filters, handleFilterChange, allCategories, handleExportCSV, colors.primary, navigation]);

  // Show full-screen loader on initial load
  if (initialLoad && loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner message="Loading transactions..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={localTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={
          localTransactions.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/**
 * Build API-compatible filter params from local filter state
 */
function buildApiFilters(filters) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.type) params.type = filters.type;
  if (filters.search) params.search = filters.search;
  return params;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  exportButton: {
    padding: 8,
  },
});
