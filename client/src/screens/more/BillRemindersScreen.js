/**
 * BillRemindersScreen (Feature #20)
 * Manage bill reminders - shows upcoming bills sorted by due date.
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
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { apiClient } from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function BillRemindersScreen() {
  const { colors, spacing, borderRadius, shadows, fontSize, fontWeight } = useTheme();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', due_date: '', recurrence: 'monthly' });
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const response = await apiClient.get('/reminders');
      setReminders(response.data.data || []);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.due_date.trim()) {
      Alert.alert('Error', 'Title and due date are required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/reminders', {
        title: formData.title,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        due_date: formData.due_date,
        recurrence: formData.recurrence,
      });
      setFormData({ title: '', amount: '', due_date: '', recurrence: 'monthly' });
      setShowForm(false);
      fetchReminders();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to create reminder.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await apiClient.put(`/reminders/${id}/paid`);
      setReminders((prev) => prev.map((r) => r.id === id ? { ...r, is_paid: true } : r));
    } catch {
      Alert.alert('Error', 'Failed to update reminder.');
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Reminder', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/reminders/${item.id}`);
          setReminders((prev) => prev.filter((r) => r.id !== item.id));
        } catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const getDueStatus = (dueDate, isPaid) => {
    if (isPaid) return { label: 'Paid', color: colors.income };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Overdue', color: colors.expense };
    if (diff === 0) return { label: 'Due Today', color: colors.expense };
    if (diff <= 3) return { label: `Due in ${diff}d`, color: colors.accent || '#F59E0B' };
    return { label: `Due in ${diff}d`, color: colors.textSecondary };
  };

  if (loading) return <LoadingSpinner message="Loading reminders..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Add Button */}
      <View style={{ padding: spacing.base }}>
        <Button
          title={showForm ? 'Cancel' : '+ Add Reminder'}
          onPress={() => setShowForm(!showForm)}
          variant={showForm ? 'outline' : undefined}
        />
      </View>

      {/* Quick Form */}
      {showForm && (
        <Card style={[{ marginHorizontal: spacing.base, marginBottom: spacing.base }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.textPrimary }]}
            placeholder="Bill title"
            placeholderTextColor={colors.textSecondary}
            value={formData.title}
            onChangeText={(t) => setFormData({ ...formData, title: t })}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.textPrimary, marginTop: 8 }]}
            placeholder="Amount (optional)"
            placeholderTextColor={colors.textSecondary}
            value={formData.amount}
            onChangeText={(t) => setFormData({ ...formData, amount: t })}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.textPrimary, marginTop: 8 }]}
            placeholder="Due date (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            value={formData.due_date}
            onChangeText={(t) => setFormData({ ...formData, due_date: t })}
          />
          <Button
            title="Save Reminder"
            onPress={handleCreate}
            loading={submitting}
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<EmptyState icon="📋" title="No Reminders" message="Add bill reminders to never miss a payment." />}
        renderItem={({ item }) => {
          const status = getDueStatus(item.due_date, item.is_paid);
          return (
            <Card style={[{ marginHorizontal: spacing.base, marginVertical: spacing.xs }]}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.metaRow, { marginTop: 4 }]}>
                    <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs }]}>
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20', marginLeft: 8 }]}>
                      <Text style={[{ color: status.color, fontSize: 11, fontWeight: '600' }]}>{status.label}</Text>
                    </View>
                  </View>
                </View>
                {item.amount && (
                  <Text style={[{ color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semiBold }]}>
                    ₱{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
              <View style={[styles.cardActions, { marginTop: spacing.sm }]}>
                {!item.is_paid && (
                  <TouchableOpacity onPress={() => handleMarkPaid(item.id)} style={styles.actionBtn}>
                    <Icon name="check-circle-outline" size={18} color={colors.income} />
                    <Text style={[{ color: colors.income, fontSize: fontSize.xs, marginLeft: 4 }]}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                  <Icon name="delete-outline" size={18} color={colors.expense} />
                  <Text style={[{ color: colors.expense, fontSize: fontSize.xs, marginLeft: 4 }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
