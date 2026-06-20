/**
 * AddEditTransactionScreen
 * Screen for creating new transactions or editing existing ones.
 * Uses TransactionForm component with data from contexts.
 *
 * Navigation params:
 * - type: 'income' | 'expense' (default type selection)
 * - transaction: object (optional, for edit mode — pre-fills form)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { useWallets } from '../../context/WalletContext';
import TransactionForm from '../../components/transactions/TransactionForm';
import { LoadingSpinner } from '../../components/common';

export default function AddEditTransactionScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { createTransaction, updateTransaction } = useTransactions();
  const { categories, fetchCategories } = useCategories();
  const { wallets, fetchWallets } = useWallets();

  // Navigation params
  const transactionType = route.params?.type || 'expense';
  const existingTransaction = route.params?.transaction || null;
  const isEditMode = !!existingTransaction;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Set screen title based on mode
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Transaction' : 'Add Transaction',
    });
  }, [navigation, isEditMode]);

  // Load categories and wallets on mount
  useEffect(() => {
    async function loadData() {
      setIsDataLoading(true);
      try {
        await Promise.all([fetchCategories(), fetchWallets()]);
      } catch (err) {
        // Contexts handle their own errors; we just stop the loading state
      } finally {
        setIsDataLoading(false);
      }
    }
    loadData();
  }, [fetchCategories, fetchWallets]);

  // Build initial values for the form
  const initialValues = isEditMode
    ? {
        type: existingTransaction.type || transactionType,
        amount: existingTransaction.amount,
        categoryId: existingTransaction.categoryId || existingTransaction.category_id,
        walletId: existingTransaction.walletId || existingTransaction.wallet_id,
        date: existingTransaction.date
          ? existingTransaction.date.split('T')[0]
          : new Date().toISOString().split('T')[0],
        description: existingTransaction.description || '',
      }
    : {
        type: transactionType,
      };

  // Flatten categories from grouped object for the form
  const allCategories = [...(categories.income || []), ...(categories.expense || [])];

  const handleSubmit = useCallback(
    async (formData) => {
      setIsSubmitting(true);
      try {
        if (isEditMode) {
          await updateTransaction(existingTransaction.id, formData);
          Alert.alert('Success', 'Transaction updated successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          await createTransaction(formData);
          Alert.alert('Success', 'Transaction added successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch (err) {
        const message =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Something went wrong. Please try again.';
        Alert.alert('Error', message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditMode, existingTransaction, createTransaction, updateTransaction, navigation]
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (isDataLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <TransactionForm
        initialValues={initialValues}
        categories={allCategories}
        wallets={wallets}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        submitLabel={isEditMode ? 'Update Transaction' : 'Add Transaction'}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
