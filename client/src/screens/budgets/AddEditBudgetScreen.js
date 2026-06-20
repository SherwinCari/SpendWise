/**
 * AddEditBudgetScreen
 * Create or edit a budget. Uses BudgetForm for input.
 * - Category picker (expense categories only)
 * - Amount limit input
 * - Period toggle (weekly/monthly)
 * - Start date picker
 * - Validation: category required, amount > 0, period required
 * - Duplicate detection: shows error if category+period already has active budget
 * - Edit mode: pre-fills existing values, only allows amount_limit update
 *
 * Requirements: 8.1, 8.2, 8.3, 8.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useBudgets } from '../../context/BudgetContext';
import { useCategories } from '../../context/CategoryContext';

const PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function AddEditBudgetScreen({ route, navigation }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();
  const { budgets, createBudget, updateBudget } = useBudgets();
  const { categories, fetchCategories } = useCategories();

  // If a budget param is passed, we're in edit mode
  const existingBudget = route?.params?.budget || null;
  const isEditMode = !!existingBudget;

  // Form state
  const [categoryId, setCategoryId] = useState(existingBudget?.categoryId || existingBudget?.category_id || '');
  const [amountLimit, setAmountLimit] = useState(
    existingBudget ? String(existingBudget.amountLimit || existingBudget.amount_limit || '') : ''
  );
  const [period, setPeriod] = useState(existingBudget?.period || 'monthly');
  const [startDate, setStartDate] = useState(
    existingBudget?.startDate || existingBudget?.start_date || formatDate(new Date())
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Set the header title based on mode
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Budget' : 'Add Budget',
    });
  }, [navigation, isEditMode]);

  // Ensure categories are loaded
  useEffect(() => {
    if (!categories.expense || categories.expense.length === 0) {
      fetchCategories().catch(() => {});
    }
  }, [categories.expense, fetchCategories]);

  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Validation logic
  const validate = useCallback(() => {
    const newErrors = {};

    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    const numAmount = parseFloat(amountLimit);
    if (!amountLimit || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    if (!period) {
      newErrors.period = 'Please select a period';
    }

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      newErrors.startDate = 'Please enter a valid date (YYYY-MM-DD)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [categoryId, amountLimit, period, startDate]);

  // Check for duplicate budget (same category + period already active)
  const checkDuplicate = useCallback(() => {
    if (isEditMode) return true; // Skip duplicate check in edit mode

    const duplicate = budgets.find(
      (b) =>
        (b.categoryId === categoryId || b.category_id === categoryId) &&
        b.period === period &&
        // Exclude the current budget if we're somehow comparing against itself
        (!existingBudget || b.id !== existingBudget.id)
    );

    if (duplicate) {
      setErrors((prev) => ({
        ...prev,
        duplicate: 'A budget already exists for this category and period.',
      }));
      return false;
    }

    return true;
  }, [budgets, categoryId, period, isEditMode, existingBudget]);

  // Submit handler
  const handleSubmit = async () => {
    setSubmitError(null);

    if (!validate()) return;
    if (!checkDuplicate()) return;

    setSubmitting(true);

    try {
      if (isEditMode) {
        // Edit mode: only update amount_limit
        await updateBudget(existingBudget.id, {
          amountLimit: parseFloat(amountLimit),
        });
      } else {
        // Create mode: send all fields
        await createBudget({
          categoryId,
          amountLimit: parseFloat(amountLimit),
          period,
          startDate,
        });
      }
      navigation.goBack();
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // Expense categories only
  const expenseCategories = categories.expense || [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: spacing.base }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Submit error banner */}
        {(submitError || errors.duplicate) && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.expense + '15',
                borderRadius: borderRadius.card,
                padding: spacing.md,
                marginBottom: spacing.base,
              },
            ]}
          >
            <Text style={[styles.errorBannerText, { color: colors.expense }]}>
              {errors.duplicate || submitError}
            </Text>
          </View>
        )}

        {/* Category Picker */}
        <View style={{ marginBottom: spacing.base }}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginBottom: spacing.sm },
            ]}
          >
            Category
          </Text>
          {isEditMode ? (
            // In edit mode, category is locked (display only)
            <View
              style={[
                styles.lockedField,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.input,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.textSecondary,
                  opacity: 0.7,
                },
              ]}
            >
              <Text style={[styles.lockedText, { color: colors.textPrimary }]}>
                {expenseCategories.find((c) => c.id === categoryId)?.name || 'Category'}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {expenseCategories.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No expense categories available
                </Text>
              ) : (
                expenseCategories.map((cat) => {
                  const isSelected = cat.id === categoryId;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        {
                          borderRadius: borderRadius.button,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.textSecondary,
                        },
                      ]}
                      onPress={() => {
                        setCategoryId(cat.id);
                        if (errors.category) {
                          setErrors((prev) => ({ ...prev, category: undefined }));
                        }
                        if (errors.duplicate) {
                          setErrors((prev) => ({ ...prev, duplicate: undefined }));
                        }
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${cat.name} category`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
          {errors.category && (
            <Text style={[styles.fieldError, { color: colors.expense, marginTop: spacing.xs }]}>
              {errors.category}
            </Text>
          )}
        </View>

        {/* Amount Limit */}
        <View style={{ marginBottom: spacing.base }}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginBottom: spacing.sm },
            ]}
          >
            Budget Limit
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderRadius: borderRadius.input,
                borderColor: errors.amount ? colors.expense : colors.textSecondary,
                color: colors.textPrimary,
                padding: spacing.md,
                fontSize: 16,
              },
            ]}
            value={amountLimit}
            onChangeText={(text) => {
              setAmountLimit(text);
              if (errors.amount) {
                setErrors((prev) => ({ ...prev, amount: undefined }));
              }
            }}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            accessibilityLabel="Budget limit amount"
          />
          {errors.amount && (
            <Text style={[styles.fieldError, { color: colors.expense, marginTop: spacing.xs }]}>
              {errors.amount}
            </Text>
          )}
        </View>

        {/* Period Toggle */}
        <View style={{ marginBottom: spacing.base }}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginBottom: spacing.sm },
            ]}
          >
            Period
          </Text>
          {isEditMode ? (
            // In edit mode, period is locked
            <View
              style={[
                styles.lockedField,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.input,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.textSecondary,
                  opacity: 0.7,
                },
              ]}
            >
              <Text style={[styles.lockedText, { color: colors.textPrimary }]}>
                {period === 'weekly' ? 'Weekly' : 'Monthly'}
              </Text>
            </View>
          ) : (
            <View style={[styles.toggleRow, { gap: spacing.sm }]}>
              {PERIODS.map(({ key, label }) => {
                const isActive = period === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.toggleButton,
                      {
                        flex: 1,
                        borderRadius: borderRadius.button,
                        paddingVertical: spacing.md,
                        backgroundColor: isActive ? colors.primary : colors.card,
                        borderWidth: 1,
                        borderColor: isActive ? colors.primary : colors.textSecondary,
                      },
                    ]}
                    onPress={() => {
                      setPeriod(key);
                      if (errors.period) {
                        setErrors((prev) => ({ ...prev, period: undefined }));
                      }
                      if (errors.duplicate) {
                        setErrors((prev) => ({ ...prev, duplicate: undefined }));
                      }
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${label} period`}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color: isActive ? '#FFFFFF' : colors.textPrimary,
                          textAlign: 'center',
                          fontWeight: '500',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.period && (
            <Text style={[styles.fieldError, { color: colors.expense, marginTop: spacing.xs }]}>
              {errors.period}
            </Text>
          )}
        </View>

        {/* Start Date */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginBottom: spacing.sm },
            ]}
          >
            Start Date
          </Text>
          {isEditMode ? (
            // In edit mode, start date is locked
            <View
              style={[
                styles.lockedField,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.input,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.textSecondary,
                  opacity: 0.7,
                },
              ]}
            >
              <Text style={[styles.lockedText, { color: colors.textPrimary }]}>
                {startDate}
              </Text>
            </View>
          ) : (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.input,
                  borderColor: errors.startDate ? colors.expense : colors.textSecondary,
                  color: colors.textPrimary,
                  padding: spacing.md,
                  fontSize: 16,
                },
              ]}
              value={startDate}
              onChangeText={(text) => {
                setStartDate(text);
                if (errors.startDate) {
                  setErrors((prev) => ({ ...prev, startDate: undefined }));
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Budget start date"
            />
          )}
          {errors.startDate && (
            <Text style={[styles.fieldError, { color: colors.expense, marginTop: spacing.xs }]}>
              {errors.startDate}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actions, { gap: spacing.sm }]}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                borderRadius: borderRadius.button,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.textSecondary,
              },
            ]}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                flex: 1,
                borderRadius: borderRadius.button,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                backgroundColor: submitting ? colors.textSecondary : colors.primary,
                ...shadows.button,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Update budget' : 'Save budget'}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {submitting
                ? 'Saving...'
                : isEditMode
                ? 'Update Budget'
                : 'Save Budget'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  errorBanner: {},
  errorBannerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
  },
  chip: {},
  chipText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  lockedField: {},
  lockedText: {
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleButton: {},
  toggleText: {
    fontSize: 14,
  },
  fieldError: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
