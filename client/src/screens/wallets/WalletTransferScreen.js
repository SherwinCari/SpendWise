/**
 * WalletTransferScreen
 * Allows users to transfer funds between wallets with validation and feedback.
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useWallets } from '../../context/WalletContext';
import TransferForm from '../../components/wallets/TransferForm';
import { LoadingSpinner } from '../../components/common';

export default function WalletTransferScreen({ navigation }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();
  const { wallets, loading, error, transferFunds, fetchWallets, clearError } = useWallets();

  const [submitting, setSubmitting] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState(null);

  // Fetch wallets on mount to ensure fresh data
  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Clear errors when unmounting
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Find selected source wallet for balance display
  const sourceWallet = wallets.find((w) => w.id === selectedSourceId);

  const handleTransfer = useCallback(async (transferData) => {
    setTransferError(null);
    setSubmitting(true);

    // Client-side validation
    const { sourceWalletId, destinationWalletId, amount } = transferData;

    if (amount <= 0) {
      setTransferError('Amount must be greater than zero');
      setSubmitting(false);
      return;
    }

    if (sourceWalletId === destinationWalletId) {
      setTransferError('Source and destination wallets must be different');
      setSubmitting(false);
      return;
    }

    const source = wallets.find((w) => w.id === sourceWalletId);
    if (source && parseFloat(source.balance) < amount) {
      setTransferError('Insufficient funds in source wallet');
      setSubmitting(false);
      return;
    }

    try {
      await transferFunds({
        sourceWalletId,
        destinationWalletId,
        amount: String(amount),
      });

      // Show success confirmation and navigate back
      Alert.alert(
        'Transfer Successful',
        `Successfully transferred $${amount.toFixed(2)} between wallets.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      // Parse specific error from server response
      const serverMessage =
        err.response?.data?.error?.message || err.message || 'Transfer failed.';
      const errorCode = err.response?.data?.error?.code;

      if (errorCode === 'INSUFFICIENT_FUNDS') {
        setTransferError('Insufficient funds in source wallet');
      } else if (errorCode === 'INVALID_TRANSFER') {
        setTransferError('Invalid transfer: source and destination must be different');
      } else if (errorCode === 'VALIDATION_ERROR') {
        setTransferError(serverMessage);
      } else {
        setTransferError(serverMessage);
      }
    } finally {
      setSubmitting(false);
    }
  }, [wallets, transferFunds, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSourceSelect = useCallback((walletId) => {
    setSelectedSourceId(walletId);
    setTransferError(null);
  }, []);

  if (loading && wallets.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header description */}
        <Text
          style={[
            styles.description,
            typography.body,
            { color: colors.textSecondary, marginBottom: spacing.lg },
          ]}
        >
          Transfer funds between your wallets. Select a source and destination
          wallet, then enter the amount to transfer.
        </Text>

        {/* Source wallet balance reference */}
        {sourceWallet && (
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: colors.card,
                borderRadius: borderRadius.card,
                padding: spacing.base,
                marginBottom: spacing.base,
                ...shadows.card,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: spacing.xs },
              ]}
            >
              Available Balance
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                {
                  color: colors.income,
                  fontSize: 24,
                  fontWeight: '700',
                },
              ]}
            >
              ${parseFloat(sourceWallet.balance).toFixed(2)}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: spacing.xs },
              ]}
            >
              {sourceWallet.name}
            </Text>
          </View>
        )}

        {/* Error display */}
        {(transferError || error) && (
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor: '#FEF2F2',
                borderRadius: borderRadius.button,
                padding: spacing.md,
                marginBottom: spacing.base,
                borderLeftWidth: 4,
                borderLeftColor: colors.expense,
              },
            ]}
          >
            <Text
              style={[
                typography.body,
                { color: colors.expense, fontWeight: '500' },
              ]}
              accessibilityRole="alert"
            >
              {transferError || error}
            </Text>
          </View>
        )}

        {/* Transfer form */}
        {wallets.length < 2 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.card,
                borderRadius: borderRadius.card,
                padding: spacing.lg,
                ...shadows.card,
              },
            ]}
          >
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center' },
              ]}
            >
              You need at least two wallets to make a transfer. Please create
              another wallet first.
            </Text>
          </View>
        ) : (
          <TransferForm
            wallets={wallets}
            onSubmit={handleTransfer}
            onCancel={handleCancel}
            onSourceSelect={handleSourceSelect}
            loading={submitting}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  description: {
    lineHeight: 22,
  },
  balanceCard: {
    alignItems: 'center',
  },
  balanceAmount: {
    textAlign: 'center',
  },
  errorContainer: {},
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
