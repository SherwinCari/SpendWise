/**
 * SavingsGoalsScreen (Feature #22)
 * View, create, and manage savings goals with progress bars.
 * Shows confetti when a goal is reached (Feature #15).
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
  Animated,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { apiClient } from '../../api/client';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

export default function SavingsGoalsScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', target_amount: '', deadline: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const response = await apiClient.get('/savings');
      setGoals(response.data.data || []);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.target_amount.trim()) {
      Alert.alert('Error', 'Name and target amount are required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/savings', {
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        deadline: formData.deadline || undefined,
      });
      setFormData({ name: '', target_amount: '', deadline: '' });
      setShowForm(false);
      fetchGoals();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to create goal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (goalId) => {
    if (!depositAmount || isNaN(parseFloat(depositAmount)) || parseFloat(depositAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    try {
      const response = await apiClient.post(`/savings/${goalId}/deposit`, { amount: parseFloat(depositAmount) });
      if (response.data.data.isGoalMet) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        Alert.alert('🎉 Congratulations!', 'You\'ve reached your savings goal!');
      }
      setDepositGoalId(null);
      setDepositAmount('');
      fetchGoals();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Deposit failed.');
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Goal', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/savings/${item.id}`);
          setGoals((prev) => prev.filter((g) => g.id !== item.id));
        } catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  if (loading) return <LoadingSpinner message="Loading savings goals..." />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Confetti effect (simple visual) */}
      {showConfetti && (
        <View style={styles.confettiOverlay}>
          <Text style={styles.confettiText}>🎉🎊🥳🎉🎊🥳🎉🎊</Text>
          <Text style={[styles.confettiMessage, { color: colors.income }]}>Goal Reached!</Text>
        </View>
      )}

      {/* Add Button */}
      <View style={{ padding: spacing.base }}>
        <Button
          title={showForm ? 'Cancel' : '+ New Savings Goal'}
          onPress={() => setShowForm(!showForm)}
          variant={showForm ? 'outline' : undefined}
        />
      </View>

      {/* Quick Form */}
      {showForm && (
        <Card style={[{ marginHorizontal: spacing.base, marginBottom: spacing.base }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.textPrimary }]}
            placeholder="Goal name (e.g. Vacation Fund)"
            placeholderTextColor={colors.textSecondary}
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.textPrimary, marginTop: 8 }]}
            placeholder="Target amount"
            placeholderTextColor={colors.textSecondary}
            value={formData.target_amount}
            onChangeText={(t) => setFormData({ ...formData, target_amount: t })}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.textPrimary, marginTop: 8 }]}
            placeholder="Deadline (YYYY-MM-DD, optional)"
            placeholderTextColor={colors.textSecondary}
            value={formData.deadline}
            onChangeText={(t) => setFormData({ ...formData, deadline: t })}
          />
          <Button title="Create Goal" onPress={handleCreate} loading={submitting} style={{ marginTop: 12 }} />
        </Card>
      )}

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={<EmptyState icon="🎯" title="No Savings Goals" message="Create a goal and start saving!" />}
        renderItem={({ item }) => {
          const current = parseFloat(item.current_amount) || 0;
          const target = parseFloat(item.target_amount) || 1;
          const percentage = Math.min((current / target) * 100, 100);
          const isComplete = percentage >= 100;

          return (
            <Card style={[{ marginHorizontal: spacing.base, marginVertical: spacing.xs }]}>
              <View style={styles.goalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium }]} numberOfLines={1}>
                    {isComplete ? '🎉 ' : ''}{item.name}
                  </Text>
                  <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }]}>
                    ₱{current.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱{target.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <Text style={[{ color: isComplete ? colors.income : colors.primary, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                  {Math.round(percentage)}%
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBar, { backgroundColor: colors.background, marginTop: spacing.sm }]}>
                <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: isComplete ? colors.income : colors.primary }]} />
              </View>

              {item.deadline && (
                <Text style={[{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 }]}>
                  Deadline: {new Date(item.deadline).toLocaleDateString()}
                </Text>
              )}

              {/* Deposit section */}
              {depositGoalId === item.id ? (
                <View style={[styles.depositRow, { marginTop: spacing.sm }]}>
                  <TextInput
                    style={[styles.depositInput, { borderColor: colors.primary + '60', color: colors.textPrimary }]}
                    placeholder="Amount"
                    placeholderTextColor={colors.textSecondary}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={[styles.depositBtn, { backgroundColor: colors.income }]}
                    onPress={() => handleDeposit(item.id)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setDepositGoalId(null); setDepositAmount(''); }}>
                    <Icon name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.cardActions, { marginTop: spacing.sm }]}>
                  {!isComplete && (
                    <TouchableOpacity onPress={() => setDepositGoalId(item.id)} style={styles.actionBtn}>
                      <Icon name="plus-circle-outline" size={18} color={colors.income} />
                      <Text style={[{ color: colors.income, fontSize: fontSize.xs, marginLeft: 4 }]}>Deposit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                    <Icon name="delete-outline" size={18} color={colors.expense} />
                    <Text style={[{ color: colors.expense, fontSize: fontSize.xs, marginLeft: 4 }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  depositRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  depositInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  depositBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  confettiOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, alignItems: 'center', paddingTop: 20 },
  confettiText: { fontSize: 32 },
  confettiMessage: { fontSize: 24, fontWeight: '700', marginTop: 8 },
});
