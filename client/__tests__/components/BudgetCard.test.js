/**
 * BudgetCard Component Tests
 * Tests category name display, progress bar, spent/limit amounts, and percentage.
 * Requirements: 16.1
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import BudgetCard from '../../src/components/budgets/BudgetCard';

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

describe('BudgetCard', () => {
  const lowBudget = {
    categoryName: 'Groceries',
    amountLimit: '1000.00',
    spent: '250.00',
  };

  const midBudget = {
    categoryName: 'Entertainment',
    amountLimit: '500.00',
    spent: '300.00',
  };

  const highBudget = {
    categoryName: 'Shopping',
    amountLimit: '200.00',
    spent: '180.00',
  };

  const overBudget = {
    categoryName: 'Dining',
    amountLimit: '100.00',
    spent: '120.00',
  };

  it('displays the category name', () => {
    const { getByText } = render(<BudgetCard budget={lowBudget} />);
    expect(getByText('Groceries')).toBeTruthy();
  });

  it('displays the percentage', () => {
    const { getByText } = render(<BudgetCard budget={lowBudget} />);
    // 250 / 1000 = 25%
    expect(getByText('25%')).toBeTruthy();
  });

  it('displays spent amount', () => {
    const { getByText } = render(<BudgetCard budget={lowBudget} />);
    expect(getByText(/250\.00 spent/)).toBeTruthy();
  });

  it('displays limit amount', () => {
    const { getByText } = render(<BudgetCard budget={lowBudget} />);
    expect(getByText(/1,000\.00 limit/)).toBeTruthy();
  });

  it('uses primary teal color for progress under 50%', () => {
    const { getByText } = render(<BudgetCard budget={lowBudget} />);
    const percentageText = getByText('25%');
    const flatStyle = Array.isArray(percentageText.props.style)
      ? Object.assign({}, ...percentageText.props.style.filter(Boolean))
      : percentageText.props.style;
    expect(flatStyle.color).toBe('#0D9488');
  });

  it('uses accent gold color for progress between 50-75%', () => {
    const { getByText } = render(<BudgetCard budget={midBudget} />);
    // 300/500 = 60%
    const percentageText = getByText('60%');
    const flatStyle = Array.isArray(percentageText.props.style)
      ? Object.assign({}, ...percentageText.props.style.filter(Boolean))
      : percentageText.props.style;
    expect(flatStyle.color).toBe('#F59E0B');
  });

  it('uses expense red color for progress at or above 75%', () => {
    const { getByText } = render(<BudgetCard budget={highBudget} />);
    // 180/200 = 90%
    const percentageText = getByText('90%');
    const flatStyle = Array.isArray(percentageText.props.style)
      ? Object.assign({}, ...percentageText.props.style.filter(Boolean))
      : percentageText.props.style;
    expect(flatStyle.color).toBe('#EF4444');
  });

  it('displays over 100% when overspent', () => {
    const { getByText } = render(<BudgetCard budget={overBudget} />);
    // 120/100 = 120%
    expect(getByText('120%')).toBeTruthy();
  });

  it('displays "Uncategorized" when categoryName is missing', () => {
    const noCategoryBudget = { amountLimit: '500', spent: '100' };
    const { getByText } = render(<BudgetCard budget={noCategoryBudget} />);
    expect(getByText('Uncategorized')).toBeTruthy();
  });

  it('handles zero spent gracefully', () => {
    const zeroBudget = {
      categoryName: 'Transport',
      amountLimit: '300.00',
      spent: '0',
    };
    const { getByText } = render(<BudgetCard budget={zeroBudget} />);
    expect(getByText('0%')).toBeTruthy();
    expect(getByText(/0\.00 spent/)).toBeTruthy();
  });

  it('has accessible label with category and percentage', () => {
    const { getByLabelText } = render(<BudgetCard budget={lowBudget} />);
    const card = getByLabelText(/Groceries.*25% spent/);
    expect(card).toBeTruthy();
  });
});
