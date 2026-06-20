/**
 * BudgetForm Component
 * Category picker, amount input, period toggle (weekly/monthly), and start date picker.
 * Requirements: 8.1, 8.5
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';

const PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function BudgetForm({ categories = [], onSubmit, onCancel, initialValues }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  const [categoryId, setCategoryId] = useState(initialValues?.categoryId || null);
  const [amountLimit, setAmountLimit] = useState(initialValues?.amountLimit || '');
  const [period, setPeriod] = useState(initialValues?.period || 'monthly');
  const [startDate, setStartDate] = useState(initialValues?.startDate || formatDate(new Date()));
  const [errors, setErrors] = useState({});

  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const validate = () => {
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
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({
        categoryId,
        amountLimit: parseFloat(amountLimit),
        period,
        startDate,
      });
    }
  };

  // Filter categories to expense type only (budgets are for expenses)
  const expenseCategories = categories.filter((cat) => cat.type === 'expense');

  return (
    <View style={[styles.container, { padding: spacing.base }]}>
      {/* Category picker */}
      <View style={{ marginBottom: spacing.base }}>
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, marginBottom: spacing.sm },
          ]}
        >
          Category
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {expenseCategories.map((cat) => {
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
                onPress={() => setCategoryId(cat.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${cat.name} category`}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {errors.category && (
          <Text style={[typography.caption, { color: colors.expense, marginTop: spacing.xs }]}>
            {errors.category}
          </Text>
        )}
      </View>

      {/* Amount input */}
      <View style={{ marginBottom: spacing.base }}>
        <Text
          style={[
            typography.label,
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
              ...typography.body,
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
          <Text style={[typography.caption, { color: colors.expense, marginTop: spacing.xs }]}>
            {errors.amount}
          </Text>
        )}
      </View>

      {/* Period toggle */}
      <View style={{ marginBottom: spacing.base }}>
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, marginBottom: spacing.sm },
          ]}
        >
          Period
        </Text>
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
                onPress={() => setPeriod(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${label} period`}
              >
                <Text
                  style={[
                    typography.label,
                    {
                      color: isActive ? '#FFFFFF' : colors.textPrimary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.period && (
          <Text style={[typography.caption, { color: colors.expense, marginTop: spacing.xs }]}>
            {errors.period}
          </Text>
        )}
      </View>

      {/* Start date input */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, marginBottom: spacing.sm },
          ]}
        >
          Start Date
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.input,
              borderColor: errors.startDate ? colors.expense : colors.textSecondary,
              color: colors.textPrimary,
              padding: spacing.md,
              ...typography.body,
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
          keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
          accessibilityLabel="Budget start date"
        />
        {errors.startDate && (
          <Text style={[typography.caption, { color: colors.expense, marginTop: spacing.xs }]}>
            {errors.startDate}
          </Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={[styles.actions, { gap: spacing.sm }]}>
        {onCancel && (
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
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel budget creation"
          >
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            {
              flex: 1,
              borderRadius: borderRadius.button,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.primary,
              ...shadows.button,
            },
          ]}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Save budget"
        >
          <Text style={[typography.label, { color: '#FFFFFF' }]}>
            Save Budget
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  chip: {},
  input: {
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
  },
  toggleButton: {},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BudgetForm;
