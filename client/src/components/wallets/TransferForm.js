/**
 * TransferForm Component
 * Source/destination wallet pickers and amount input for wallet-to-wallet transfers.
 * Requirements: 11.1
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme';

function TransferForm({ wallets = [], onSubmit, onCancel, onSourceSelect, loading = false }) {
  const { colors, typography, spacing, borderRadius, shadows } = useTheme();

  const [sourceWalletId, setSourceWalletId] = useState(null);
  const [destinationWalletId, setDestinationWalletId] = useState(null);
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState({});

  const sourceWallet = wallets.find((w) => w.id === sourceWalletId);

  const handleSourceChange = (walletId) => {
    setSourceWalletId(walletId);
    if (onSourceSelect) {
      onSourceSelect(walletId);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!sourceWalletId) {
      newErrors.source = 'Please select a source wallet';
    }
    if (!destinationWalletId) {
      newErrors.destination = 'Please select a destination wallet';
    }
    if (sourceWalletId && destinationWalletId && sourceWalletId === destinationWalletId) {
      newErrors.destination = 'Source and destination must be different';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    } else if (sourceWallet && numAmount > parseFloat(sourceWallet.balance)) {
      newErrors.amount = 'Amount exceeds available balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({
        sourceWalletId,
        destinationWalletId,
        amount: parseFloat(amount),
      });
    }
  };

  const renderWalletPicker = (label, selectedId, onSelect, errorKey) => (
    <View style={{ marginBottom: spacing.base }}>
      <Text
        style={[
          typography.label,
          { color: colors.textSecondary, marginBottom: spacing.sm },
        ]}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {wallets.map((wallet) => {
          const isSelected = wallet.id === selectedId;
          return (
            <TouchableOpacity
              key={wallet.id}
              style={[
                styles.walletChip,
                {
                  borderRadius: borderRadius.button,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.primary : colors.textSecondary,
                },
              ]}
              onPress={() => onSelect(wallet.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${wallet.name} wallet`}
            >
              <Text
                style={[
                  typography.label,
                  { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {wallet.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {errors[errorKey] && (
        <Text style={[typography.caption, { color: colors.expense, marginTop: spacing.xs }]}>
          {errors[errorKey]}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { padding: spacing.base }]}>
      {renderWalletPicker('From', sourceWalletId, handleSourceChange, 'source')}
      {renderWalletPicker('To', destinationWalletId, setDestinationWalletId, 'destination')}

      {/* Amount input */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, marginBottom: spacing.sm },
          ]}
        >
          Amount
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
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            if (errors.amount) {
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }
          }}
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          accessibilityLabel="Transfer amount"
        />
        {errors.amount && (
          <Text style={[typography.caption, { color: colors.expense, marginTop: spacing.xs }]}>
            {errors.amount}
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
            accessibilityLabel="Cancel transfer"
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
              backgroundColor: loading ? colors.textSecondary : colors.primary,
              ...shadows.button,
            },
          ]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Submit transfer"
          accessibilityState={{ disabled: loading }}
        >
          <Text style={[typography.label, { color: '#FFFFFF' }]}>
            {loading ? 'Transferring...' : 'Transfer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  walletChip: {},
  input: {
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TransferForm;
