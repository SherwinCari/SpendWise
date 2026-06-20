/**
 * SpendWise AmountText Component
 * Formatted currency display — green for income, red for expense.
 */

import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../theme';

function AmountText({
  amount,
  type,
  currency = '₱',
  showSign = true,
  style,
  size = 'body',
}) {
  const { colors, typography } = useTheme();

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isIncome = type === 'income';
  const color = isIncome ? colors.income : colors.expense;
  const sign = showSign ? (isIncome ? '+' : '-') : '';

  const formattedAmount = Math.abs(numericAmount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const textStyle = typography[size] || typography.body;

  return (
    <Text
      style={[textStyle, { color }, style]}
      accessibilityLabel={`${isIncome ? 'Income' : 'Expense'} ${currency}${formattedAmount}`}
    >
      {sign}{currency}{formattedAmount}
    </Text>
  );
}

export default AmountText;
