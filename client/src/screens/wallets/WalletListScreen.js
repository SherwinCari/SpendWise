/**
 * WalletListScreen
 * Displays user wallets as cards with total balance header.
 * Supports add, edit name, delete (with validation), and transfer navigation.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useWallets } from '../../context/WalletContext';
import WalletCard from '../../components/wallets/WalletCard';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function WalletListScreen({ navigation }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();
  const {
    wallets,
    loading,
    error,
    fetchWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    clearError,
  } = useWallets();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('created'); // 'balance' | 'name' | 'created'

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchWallets();
    } finally {
      setRefreshing(false);
    }
  }, [fetchWallets]);

  // Calculate total balance across all wallets
  const totalBalance = wallets.reduce((sum, wallet) => {
    return sum + (parseFloat(wallet.balance) || 0);
  }, 0);

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Sorted wallets based on selected sort option
  const sortedWallets = useMemo(() => {
    const list = [...wallets];
    switch (sortBy) {
      case 'balance':
        return list.sort((a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0));
      case 'name':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'created':
      default:
        return list; // Already ordered by recently created from API
    }
  }, [wallets, sortBy]);

  // --- Add Wallet ---
  const handleOpenAddModal = () => {
    setWalletName('');
    setWalletBalance('');
    setFormError('');
    setShowAddModal(true);
  };

  const handleAddWallet = async () => {
    const trimmedName = walletName.trim();
    if (!trimmedName) {
      setFormError('Wallet name is required.');
      return;
    }

    const balance = parseFloat(walletBalance) || 0;
    if (balance < 0) {
      setFormError('Initial balance cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await createWallet({ name: trimmedName, balance });
      setShowAddModal(false);
      setFormError('');
    } catch (err) {
      setFormError(
        err.response?.data?.error?.message || err.userMessage || 'Failed to create wallet.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- Edit Wallet ---
  const handleOpenEditModal = (wallet) => {
    setSelectedWallet(wallet);
    setWalletName(wallet.name);
    setFormError('');
    setShowEditModal(true);
  };

  const handleEditWallet = async () => {
    const trimmedName = walletName.trim();
    if (!trimmedName) {
      setFormError('Wallet name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await updateWallet(selectedWallet.id, { name: trimmedName });
      setShowEditModal(false);
      setSelectedWallet(null);
      setFormError('');
    } catch (err) {
      setFormError(
        err.response?.data?.error?.message || err.userMessage || 'Failed to update wallet.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete Wallet ---
  const handleOpenDeleteModal = (wallet) => {
    setSelectedWallet(wallet);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDeleteWallet = async () => {
    setSubmitting(true);
    try {
      await deleteWallet(selectedWallet.id);
      setShowDeleteModal(false);
      setSelectedWallet(null);
      setDeleteError('');
    } catch (err) {
      const message =
        err.response?.data?.error?.message || err.userMessage || 'Failed to delete wallet.';
      setDeleteError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Long press actions ---
  const handleWalletLongPress = (wallet) => {
    Alert.alert(wallet.name, 'Choose an action', [
      {
        text: 'Edit Name',
        onPress: () => handleOpenEditModal(wallet),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleOpenDeleteModal(wallet),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // --- Render wallet card ---
  const renderWalletItem = ({ item }) => (
    <View style={{ marginBottom: spacing.md }}>
      <TouchableOpacity
        onLongPress={() => handleWalletLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.8}
        accessibilityHint="Long press for edit and delete options"
      >
        <WalletCard wallet={item} onPress={() => handleOpenEditModal(item)} />
      </TouchableOpacity>
    </View>
  );

  // --- Total Balance Header ---
  const renderHeader = () => (
    <View>
      <View
        style={[
          styles.totalBalanceCard,
          {
            backgroundColor: colors.primary,
            borderRadius: borderRadius.card,
            padding: spacing.lg,
            marginBottom: spacing.md,
            ...shadows.cardElevated,
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Total balance: ${formatCurrency(totalBalance)}`}
      >
        <Text style={[styles.totalLabel, { color: '#FFFFFF', opacity: 0.85 }]}>
          Total Balance
        </Text>
        <Text style={[styles.totalAmount, { color: '#FFFFFF' }]}>
          {formatCurrency(totalBalance)}
        </Text>
        <Text style={[styles.walletCount, { color: '#FFFFFF', opacity: 0.7 }]}>
          {wallets.length} {wallets.length === 1 ? 'wallet' : 'wallets'}
        </Text>
      </View>

      {/* Sort Options */}
      <View style={[styles.sortRow, { marginBottom: spacing.md }]}>
        {[
          { key: 'created', label: 'Recent' },
          { key: 'balance', label: 'Balance' },
          { key: 'name', label: 'A-Z' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortChip,
              {
                backgroundColor: sortBy === option.key ? colors.primary : colors.card,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginRight: 8,
                ...shadows.card,
              },
            ]}
            onPress={() => setSortBy(option.key)}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${option.label}`}
          >
            <Text
              style={{
                color: sortBy === option.key ? '#FFFFFF' : colors.textSecondary,
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // --- Transfer Button ---
  const renderTransferButton = () => {
    if (wallets.length < 2) return null;

    return (
      <TouchableOpacity
        style={[
          styles.transferButton,
          {
            backgroundColor: colors.accent,
            borderRadius: borderRadius.button,
            marginBottom: spacing.lg,
            ...shadows.button,
          },
        ]}
        onPress={() => navigation.navigate('WalletTransfer')}
        accessibilityRole="button"
        accessibilityLabel="Transfer between wallets"
      >
        <Text style={[styles.transferButtonText, typography.label, { color: '#FFFFFF' }]}>
          Transfer Between Wallets
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading && wallets.length === 0 && !refreshing ? (
        <LoadingSpinner message="Loading wallets..." />
      ) : wallets.length === 0 && !loading ? (
        <EmptyState
          icon="💰"
          title="No Wallets Yet"
          message="Create your first wallet to start tracking your money across different accounts."
        />
      ) : (
        <FlatList
          data={sortedWallets}
          keyExtractor={(item) => item.id}
          renderItem={renderWalletItem}
          ListHeaderComponent={
            <>
              {renderHeader()}
              {renderTransferButton()}
            </>
          }
          contentContainerStyle={{
            padding: spacing.base,
            paddingBottom: 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB - Add Wallet Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            ...shadows.cardElevated,
          },
        ]}
        onPress={handleOpenAddModal}
        accessibilityRole="button"
        accessibilityLabel="Add Wallet"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Wallet Modal */}
      <Modal
        visible={showAddModal}
        title="Create Wallet"
        onConfirm={handleAddWallet}
        onCancel={() => {
          setShowAddModal(false);
          setFormError('');
        }}
        confirmText="Create"
        cancelText="Cancel"
        confirmLoading={submitting}
      >
        <Input
          label="Wallet Name"
          value={walletName}
          onChangeText={(text) => {
            setWalletName(text);
            setFormError('');
          }}
          placeholder="e.g. Cash, Bank, GCash"
          error={formError && !walletBalance ? formError : ''}
          style={{ marginBottom: spacing.md }}
        />
        <Input
          label="Initial Balance"
          value={walletBalance}
          onChangeText={(text) => {
            setWalletBalance(text);
            setFormError('');
          }}
          placeholder="0.00"
          keyboardType="numeric"
          error={formError && walletBalance ? formError : ''}
          style={{ marginBottom: spacing.sm }}
        />
        {formError ? (
          <Text
            style={[
              { color: colors.expense, fontSize: 12, marginTop: spacing.xs },
            ]}
            accessibilityRole="alert"
          >
            {formError}
          </Text>
        ) : null}
      </Modal>

      {/* Edit Wallet Modal */}
      <Modal
        visible={showEditModal}
        title="Edit Wallet Name"
        onConfirm={handleEditWallet}
        onCancel={() => {
          setShowEditModal(false);
          setSelectedWallet(null);
          setFormError('');
        }}
        confirmText="Save"
        cancelText="Cancel"
        confirmLoading={submitting}
      >
        <Input
          label="Wallet Name"
          value={walletName}
          onChangeText={(text) => {
            setWalletName(text);
            setFormError('');
          }}
          placeholder="Enter wallet name"
          error={formError}
          style={{ marginBottom: spacing.sm }}
        />
      </Modal>

      {/* Delete Wallet Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        title="Delete Wallet"
        message={
          deleteError
            ? undefined
            : `Are you sure you want to delete "${selectedWallet?.name}"? This action cannot be undone.`
        }
        onConfirm={deleteError ? undefined : handleDeleteWallet}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedWallet(null);
          setDeleteError('');
        }}
        confirmText="Delete"
        cancelText={deleteError ? 'Close' : 'Cancel'}
        confirmVariant="danger"
        confirmLoading={submitting}
      >
        {deleteError ? (
          <View>
            <Text
              style={[
                typography.body,
                { color: colors.expense, marginBottom: spacing.sm },
              ]}
              accessibilityRole="alert"
            >
              {deleteError}
            </Text>
            <Text
              style={[typography.caption, { color: colors.textSecondary }]}
            >
              Wallets with transactions or a non-zero balance cannot be deleted.
            </Text>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  totalBalanceCard: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  walletCount: {
    fontSize: 12,
    fontWeight: '400',
  },
  transferButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  transferButtonText: {
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortChip: {},
});
