/**
 * TransactionCard Component Tests
 * Tests amount display (green for income, red for expense), description, date, and press events.
 * Requirements: 16.1
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionCard from '../../src/components/transactions/TransactionCard';

// Mock the theme module
jest.mock('../../src/theme', () => {
  const { lightColors } = require('../../src/theme/colors');
  const { typography, fontSize, fontWeight } = require('../../src/theme/typography');
  const { spacing } = require('../../src/theme/spacing');
  const { borderRadius, shadows } = require('../../src/theme/shapes');

  return {
    useTheme: () => ({
      mode: 'light',
      isDark: false,
      colors: lightColors,
      typography,
      fontSize,
      fontWeight,
      spacing,
      borderRadius,
      shadows,
      toggleTheme: jest.fn(),
    }),
  };
});

describe('TransactionCard', () => {
  const incomeTransaction = {
    amount: 1500.5,
    type: 'income',
    description: 'Salary payment',
    date: new Date().toISOString(),
    categoryName: 'Salary',
    categoryIcon: 'cash',
    categoryColor: '#10B981',
    walletName: 'Main Wallet',
  };

  const expenseTransaction = {
    amount: 42.99,
    type: 'expense',
    description: 'Grocery shopping',
    date: new Date().toISOString(),
    categoryName: 'Food',
    categoryIcon: 'food',
    categoryColor: '#EF4444',
    walletName: 'Cash',
  };

  it('displays the description text', () => {
    const { getByText } = render(
      <TransactionCard transaction={incomeTransaction} />
    );
    expect(getByText('Salary payment')).toBeTruthy();
  });

  it('displays formatted income amount with + prefix in green', () => {
    const { getByText } = render(
      <TransactionCard transaction={incomeTransaction} />
    );
    // Amount should show + prefix for income
    const amountText = getByText(/^\+₱/);
    expect(amountText).toBeTruthy();
    // Color should be income green
    const flatStyle = Array.isArray(amountText.props.style)
      ? Object.assign({}, ...amountText.props.style.filter(Boolean))
      : amountText.props.style;
    expect(flatStyle.color).toBe('#10B981');
  });

  it('displays formatted expense amount with - prefix in red', () => {
    const { getByText } = render(
      <TransactionCard transaction={expenseTransaction} />
    );
    // Amount should show - prefix for expense
    const amountText = getByText(/^-₱/);
    expect(amountText).toBeTruthy();
    // Color should be expense red
    const flatStyle = Array.isArray(amountText.props.style)
      ? Object.assign({}, ...amountText.props.style.filter(Boolean))
      : amountText.props.style;
    expect(flatStyle.color).toBe('#EF4444');
  });

  it('displays "Today" for current date transactions', () => {
    const { getByText } = render(
      <TransactionCard transaction={incomeTransaction} />
    );
    expect(getByText('Today')).toBeTruthy();
  });

  it('displays wallet name', () => {
    const { getByText } = render(
      <TransactionCard transaction={incomeTransaction} />
    );
    expect(getByText('Main Wallet')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <TransactionCard transaction={incomeTransaction} onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress (non-interactive)', () => {
    const { getByText } = render(
      <TransactionCard transaction={expenseTransaction} />
    );
    expect(getByText('Grocery shopping')).toBeTruthy();
  });

  it('displays category name when no description', () => {
    const noDescTransaction = {
      ...incomeTransaction,
      description: undefined,
    };
    const { getByText } = render(
      <TransactionCard transaction={noDescTransaction} />
    );
    expect(getByText('Salary')).toBeTruthy();
  });

  it('displays "Transaction" fallback when no description or category', () => {
    const minimalTransaction = {
      amount: 100,
      type: 'expense',
      date: new Date().toISOString(),
    };
    const { getByText } = render(
      <TransactionCard transaction={minimalTransaction} />
    );
    expect(getByText('Transaction')).toBeTruthy();
  });
});
