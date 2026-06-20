/**
 * SpendWise Transaction Details Screen
 * Displays all transaction fields with formatted amounts, dates,
 * category with icon/color, wallet name, and edit/delete actions.
 *
 * Requirements: 5.1, 6.1, 6.2
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useTransactions } from '../../context/TransactionContext';
import { useWallets } from '../../context/WalletContext';
import { useCategories } from '../../context/CategoryContext';
import Card from '../../components/common/Card';
import AmountText from '../../components/common/AmountText';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function TransactionDetailsScreen({ route, navigation }) {
  const { transactionId } = route.params;
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { transactions, deleteTransaction, loading } = useTransactions();
  const { wallets } = useWallets();
  const { allCategories } = useCategories();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Find the transaction from context
  const transaction = useMemo(
    () => transactions.find((t) => t.id === transactionId),
    [transactions, transactionId]
  );

  // Look up category details
  const category = useMemo(() => {
    if (!transaction) return null;
    return allCategories.find((c) => c.id === transaction.category_id || c.id === transaction.categoryId);
  }, [allCategories, transaction]);

  // Look up wallet name
  const wallet = useMemo(() => {
    if (!transaction) return null;
    return wallets.find((w) => w.id === transaction.wallet_id || w.id === transaction.walletId);
  }, [wallets, transaction]);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = () => {
    navigation.navigate('AddEditTransaction', { transaction });
  };

  const handleDeletePress = () => {
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteTransaction(transactionId);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (err) {
      setDeleteModalVisible(false);
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
  };

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Transaction not found.
          </Text>
        </View>
      </View>
    );
  }

  const isIncome = transaction.type === 'income';
  const typeColor = isIncome ? '#10B981' : '#EF4444';
  const categoryIcon = category?.icon || 'help-circle-outline';
  const categoryColor = category?.color || colors.textSecondary;
  const categoryName = category?.name || 'Uncategorized';
  const walletName = wallet?.name || 'Unknown Wallet';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Header */}
        <View style={[styles.amountSection, { marginBottom: spacing.lg }]}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: typeColor + '15',
                borderRadius: borderRadius.button,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Icon
              name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={16}
              color={typeColor}
            />
            <Text
              style={[
                typography.label,
                { color: typeColor, marginLeft: spacing.xs, textTransform: 'capitalize' },
              ]}
            >
              {transaction.type}
            </Text>
          </View>
          <AmountText
            amount={transaction.amount}
            type={transaction.type}
            size="h1"
            showSign={true}
          />
        </View>

        {/* Details Card */}
        <Card style={{ marginBottom: spacing.base }}>
          {/* Description */}
          {transaction.description ? (
            <DetailRow
              icon="text"
              label="Description"
              value={transaction.description}
              colors={colors}
              spacing={spacing}
              typography={typography}
            />
          ) : null}

          {/* Category */}
          <DetailRow
            icon={categoryIcon}
            iconColor={categoryColor}
            label="Category"
            value={categoryName}
            colors={colors}
            spacing={spacing}
            typography={typography}
            showColorDot={true}
            dotColor={categoryColor}
          />

          {/* Wallet */}
          <DetailRow
            icon="wallet"
            label="Wallet"
            value={walletName}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />

          {/* Date */}
          <DetailRow
            icon="calendar"
            label="Date"
            value={formatDate(transaction.date)}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />

          {/* Time (from created_at) */}
          {transaction.created_at || transaction.createdAt ? (
            <DetailRow
              icon="clock-outline"
              label="Created"
              value={`${formatDate(transaction.created_at || transaction.createdAt)} at ${formatTime(transaction.created_at || transaction.createdAt)}`}
              colors={colors}
              spacing={spacing}
              typography={typography}
              isLast={!(transaction.updated_at || transaction.updatedAt)}
            />
          ) : null}

          {/* Updated at */}
          {transaction.updated_at || transaction.updatedAt ? (
            <DetailRow
              icon="update"
              label="Last Updated"
              value={`${formatDate(transaction.updated_at || transaction.updatedAt)} at ${formatTime(transaction.updated_at || transaction.updatedAt)}`}
              colors={colors}
              spacing={spacing}
              typography={typography}
              isLast={true}
            />
          ) : null}
        </Card>

        {/* Action Buttons */}
        <View style={[styles.actions, { marginTop: spacing.md }]}>
          <Button
            title="Edit Transaction"
            onPress={handleEdit}
            variant="primary"
            style={{ marginBottom: spacing.md }}
          />
          <Button
            title="Delete Transaction"
            onPress={handleDeletePress}
            variant="danger"
            loading={deleting}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        title="Delete Transaction"
        message={`Are you sure you want to delete this ${transaction.type} transaction of ₱${Math.abs(parseFloat(transaction.amount)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}? This will ${isIncome ? 'decrease' : 'increase'} your wallet balance accordingly.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </View>
  );
}

/**
 * DetailRow — A single row in the details card
 */
function DetailRow({
  icon,
  iconColor,
  label,
  value,
  colors,
  spacing,
  typography,
  showColorDot = false,
  dotColor,
  isLast = false,
}) {
  return (
    <View
      style={[
        styles.detailRow,
        {
          paddingVertical: spacing.md,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.textSecondary + '20',
        },
      ]}
    >
      <View style={[styles.detailIcon, { marginRight: spacing.md }]}>
        <Icon
          name={icon}
          size={20}
          color={iconColor || colors.textSecondary}
        />
      </View>
      <View style={styles.detailContent}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 2 }]}>
          {label}
        </Text>
        <View style={styles.detailValueRow}>
          {showColorDot && (
            <View
              style={[
                styles.colorDot,
                { backgroundColor: dotColor, marginRight: spacing.xs },
              ]}
            />
          )}
          <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountSection: {
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {},
});
