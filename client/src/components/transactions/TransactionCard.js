/**
 * TransactionCard Component
 * Displays a single transaction with colored amount, category icon,
 * description, date, and wallet name.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';

/**
 * @param {object} props
 * @param {object} props.transaction - Transaction data object
 * @param {number|string} props.transaction.amount - Transaction amount
 * @param {'income'|'expense'} props.transaction.type - Transaction type
 * @param {string} [props.transaction.description] - Transaction description
 * @param {string} props.transaction.date - ISO date string
 * @param {string} [props.transaction.categoryName] - Category display name
 * @param {string} [props.transaction.categoryIcon] - MaterialCommunityIcons icon name
 * @param {string} [props.transaction.categoryColor] - Category color hex
 * @param {string} [props.transaction.walletName] - Wallet display name
 * @param {function} [props.onPress] - Called when card is pressed
 */
export default function TransactionCard({ transaction, onPress }) {
  const { colors, spacing, borderRadius, shadows, typography, fontSize, fontWeight } = useTheme();

  const {
    amount,
    type,
    description,
    date,
    categoryName,
    categoryIcon,
    categoryColor,
    walletName,
  } = transaction;

  const isIncome = type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const amountPrefix = isIncome ? '+' : '-';
  const formattedAmount = `${amountPrefix}₱${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedDate = formatDate(date);
  const iconName = categoryIcon || (isIncome ? 'arrow-down-circle' : 'arrow-up-circle');
  const iconColor = categoryColor || colors.primary;

  const content = (
    <View style={[styles.container, { backgroundColor: colors.card, borderRadius: borderRadius.card, ...shadows.card }]}>
      {/* Category Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15`, borderRadius: borderRadius.button }]}>
        <Icon name={iconName} size={24} color={iconColor} />
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text
          style={[styles.description, { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium }]}
          numberOfLines={1}
        >
          {description || categoryName || 'Transaction'}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
            {formattedDate}
          </Text>
          {walletName && (
            <>
              <Text style={[styles.metaDot, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                {walletName}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: amountColor, fontSize: fontSize.base, fontWeight: fontWeight.semiBold }]}>
        {formattedAmount}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${description || categoryName || 'Transaction'}, ${formattedAmount}`}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const transDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - transDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {},
  metaDot: {
    marginHorizontal: 4,
  },
  amount: {
    textAlign: 'right',
  },
});
