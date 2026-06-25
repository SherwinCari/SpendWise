/**
 * TransactionCard Component
 * Displays a single transaction with colored amount, category icon,
 * description, date, and wallet name.
 * 
 * Feature #11: Swipe left to reveal delete button.
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';

/**
 * @param {object} props
 * @param {object} props.transaction - Transaction data object
 * @param {function} [props.onPress] - Called when card is pressed
 * @param {function} [props.onDelete] - Called when delete is triggered via swipe
 */
export default function TransactionCard({ transaction, onPress, onDelete }) {
  const { colors, spacing, borderRadius, shadows, fontSize, fontWeight } = useTheme();
  const swipeableRef = useRef(null);

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

  const renderRightActions = (progress, dragX) => {
    if (!onDelete) return null;

    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: colors.expense, borderRadius: borderRadius.card }]}
        onPress={() => {
          if (swipeableRef.current) swipeableRef.current.close();
          onDelete(transaction);
        }}
        accessibilityRole="button"
        accessibilityLabel="Delete transaction"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

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

  const wrappedContent = onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${description || categoryName || 'Transaction'}, ${formattedAmount}`}>
      {content}
    </TouchableOpacity>
  ) : content;

  // Only wrap in Swipeable if onDelete is provided
  if (onDelete) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
      >
        {wrappedContent}
      </Swipeable>
    );
  }

  return wrappedContent;
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
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 4,
    marginRight: 16,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
