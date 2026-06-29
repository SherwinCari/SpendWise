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
  TouchableOpacity,
  Text,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useTransactions } from '../../context/TransactionContext';
import { useCategories } from '../../context/CategoryContext';
import { useWallets } from '../../context/WalletContext';
import TransactionForm from '../../components/transactions/TransactionForm';
import { LoadingSpinner } from '../../components/common';
import { getTemplates } from '../more/TransactionTemplatesScreen';

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
  const [templates, setTemplates] = useState([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateValues, setTemplateValues] = useState(null);

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
        const tmpl = await getTemplates();
        setTemplates(tmpl);
      } catch (err) {
        // Contexts handle their own errors; we just stop the loading state
      } finally {
        setIsDataLoading(false);
      }
    }
    loadData();
  }, [fetchCategories, fetchWallets]);

  // Build initial values for the form
  const initialValues = templateValues
    ? templateValues
    : isEditMode
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

  const handleTemplateSelect = (template) => {
    setTemplateValues({
      type: template.type || transactionType,
      amount: template.amount || undefined,
      description: template.name || '',
    });
    setShowTemplatePicker(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* From Template Button */}
      {!isEditMode && templates.length > 0 && (
        <TouchableOpacity
          style={[styles.templateButton, { borderColor: colors.primary + '50', backgroundColor: colors.card }]}
          onPress={() => setShowTemplatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Fill from template"
        >
          <Icon name="file-document-outline" size={18} color={colors.primary} />
          <Text style={[styles.templateButtonText, { color: colors.primary }]}>From Template</Text>
        </TouchableOpacity>
      )}

      <TransactionForm
        key={templateValues ? `tmpl-${Date.now()}` : `${transactionType}-${existingTransaction?.id || 'new'}`}
        initialValues={initialValues}
        categories={allCategories}
        wallets={wallets}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        submitLabel={isEditMode ? 'Update Transaction' : 'Add Transaction'}
      />

      {/* Template Picker Modal */}
      <Modal visible={showTemplatePicker} transparent animationType="slide" onRequestClose={() => setShowTemplatePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTemplatePicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Template</Text>
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.templateItem}
                  onPress={() => handleTemplateSelect(item)}
                >
                  <View style={[styles.templateDot, { backgroundColor: item.type === 'income' ? colors.income : colors.expense }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.textPrimary, fontSize: 15, fontWeight: '500' }]}>{item.name}</Text>
                    <Text style={[{ color: colors.textSecondary, fontSize: 12 }]}>
                      {item.type} {item.amount ? `• ₱${item.amount}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 6,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    maxHeight: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  templateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
});
