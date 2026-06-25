/**
 * RecurringTransactionsScreen (Feature #17)
 * Manage recurring transactions - list, create, and execute due items.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { apiClient } from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function RecurringTransactionsScreen() {
  const { colors, spacing, borderRadius, shadows, fontSize, fontWeight } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executing, setExecuting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const response = await apiClient.get('/recurring');
      setItems(response.data.data || []);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const response = await apiClient.post('/recurring/execute');
      const data = response.data.data;
      Alert.alert('Done', `Executed ${data.executed} recurring transaction(s).`);
      fetchItems();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to execute recurring transactions.');
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Recurring Transaction',
      `Delete "${item.description || 'recurring transaction'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/recurring/${item.id}`);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {
              Alert.alert('Error', 'Failed to delete.');
            }
          },
        },
      ]
    );
  };

  const handleToggle = async (item) => {
    try {
      await apiClient.put(`/recurring/${item.id}`, { is_active: !item.is_active });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
    } catch {
      Alert.alert('Error', 'Failed to update.');
    }
  };

  const getFrequencyLabel = (freq) => {
    const labels = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', yearly: 'Yearly' };
    return labels[freq] || freq;
  };

  if (loading) return <LoadingSpinner message="Loading recurring transactions..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Execute Button */}
      <View style={{ padding: spacing.base }}>
        <Button
          title={executing ? 'Processing...' : 'Execute Due Transactions'}
          onPress={handleExecute}
          loading={executing}
          disabled={executing || items.length === 0}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<EmptyState icon="🔄" title="No Recurring Transactions" message="Add recurring transactions to automate your finances." />}
        renderItem={({ item }) => (
          <Card style={[styles.card, { marginHorizontal: spacing.base, marginVertical: spacing.xs }]}>
            <View style={styles.cardRow}>
              <View style={[styles.typeIndicator, { backgroundColor: item.type === 'income' ? colors.income : colors.expense }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium }]} numberOfLines={1}>
                  {item.description || item.category_name || 'Recurring'}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                  {getFrequencyLabel(item.frequency)} • Next: {item.next_due_date ? new Date(item.next_due_date).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <Text style={[styles.cardAmount, { color: item.type === 'income' ? colors.income : colors.expense, fontSize: fontSize.base, fontWeight: fontWeight.semiBold }]}>
                {item.type === 'income' ? '+' : '-'}₱{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.cardActions, { marginTop: spacing.sm }]}>
              <TouchableOpacity onPress={() => handleToggle(item)} style={styles.actionBtn}>
                <Icon name={item.is_active ? 'pause-circle' : 'play-circle'} size={20} color={item.is_active ? colors.accent : colors.income} />
                <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, marginLeft: 4 }]}>
                  {item.is_active ? 'Pause' : 'Resume'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Icon name="delete-outline" size={20} color={colors.expense} />
                <Text style={[{ color: colors.expense, fontSize: fontSize.xs, marginLeft: 4 }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  typeIndicator: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  cardTitle: {},
  cardMeta: { marginTop: 2 },
  cardAmount: {},
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
});
