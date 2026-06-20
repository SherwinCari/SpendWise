/**
 * BudgetListScreen
 * Displays budgets as BudgetCard components with progress bars.
 * Progress bar colors: teal (0-50%), gold (50-75%), red (75-100%+).
 * Shows spent/limit amounts and percentage.
 * "Add Budget" button, tap to edit, swipe/long-press to delete.
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useBudgets } from '../../context/BudgetContext';
import BudgetCard from '../../components/budgets/BudgetCard';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function BudgetListScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const { budgets, loading, fetchBudgets, deleteBudget } = useBudgets();

  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBudgets();
    } catch (_) {
      // Error handled by context
    } finally {
      setRefreshing(false);
    }
  }, [fetchBudgets]);

  const handleAddBudget = () => {
    navigation.navigate('AddEditBudget');
  };

  const handleEditBudget = (budget) => {
    navigation.navigate('AddEditBudget', { budget });
  };

  const handleDeletePrompt = (budgetId) => {
    setSelectedBudgetId(budgetId);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBudgetId) return;
    setDeleting(true);
    try {
      await deleteBudget(selectedBudgetId);
    } catch (_) {
      Alert.alert('Error', 'Failed to delete budget. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setSelectedBudgetId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSelectedBudgetId(null);
  };

  const renderBudgetItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleEditBudget(item)}
      onLongPress={() => handleDeletePrompt(item.id)}
      style={[styles.cardWrapper, { marginBottom: spacing.md }]}
      accessibilityRole="button"
      accessibilityLabel={`Edit budget ${item.categoryName || 'budget'}`}
      accessibilityHint="Tap to edit, long press to delete"
    >
      <BudgetCard budget={item} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="💰"
      title="No Budgets Yet"
      message="Set spending limits for your categories to stay on track."
    />
  );

  // Show full-screen loader only on first load
  if (loading && budgets.length === 0 && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id || item.budgetId || String(Math.random())}
        renderItem={renderBudgetItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          { padding: spacing.base },
          budgets.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Add Budget Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddBudget}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Add Budget"
      >
        <View style={styles.fabContent}>
          <View style={styles.fabIcon}>
            <View style={[styles.fabIconHorizontal, { backgroundColor: '#FFFFFF' }]} />
            <View style={[styles.fabIconVertical, { backgroundColor: '#FFFFFF' }]} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        title="Delete Budget"
        message="Are you sure you want to delete this budget? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        confirmLoading={deleting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Space for FAB
  },
  emptyListContent: {
    flexGrow: 1,
  },
  cardWrapper: {},
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIconHorizontal: {
    position: 'absolute',
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  fabIconVertical: {
    position: 'absolute',
    width: 3,
    height: 20,
    borderRadius: 1.5,
  },
});
