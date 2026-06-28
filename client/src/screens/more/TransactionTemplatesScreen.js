/**
 * TransactionTemplatesScreen
 * Manage transaction templates stored in AsyncStorage.
 * Users can create, view, and delete templates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

const TEMPLATES_KEY = '@quorax_transaction_templates';

export async function getTemplates() {
  try {
    const stored = await AsyncStorage.getItem(TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function saveTemplate(template) {
  const templates = await getTemplates();
  const newTemplate = {
    id: Date.now().toString(),
    ...template,
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
}

export async function deleteTemplate(templateId) {
  const templates = await getTemplates();
  const filtered = templates.filter((t) => t.id !== templateId);
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
}

export default function TransactionTemplatesScreen({ navigation }) {
  const { colors, spacing, borderRadius, shadows, fontSize, fontWeight } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState('expense');
  const [formError, setFormError] = useState('');

  const loadTemplates = useCallback(async () => {
    const data = await getTemplates();
    setTemplates(data);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadTemplates);
    return unsubscribe;
  }, [navigation, loadTemplates]);

  const handleAdd = async () => {
    if (!formName.trim()) {
      setFormError('Template name is required');
      return;
    }

    await saveTemplate({
      name: formName.trim(),
      amount: formAmount ? parseFloat(formAmount) : null,
      category: formCategory.trim() || null,
      type: formType,
    });

    setShowAddModal(false);
    setFormName('');
    setFormAmount('');
    setFormCategory('');
    setFormType('expense');
    setFormError('');
    loadTemplates();
  };

  const handleDelete = (template) => {
    Alert.alert('Delete Template', `Remove "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(template.id);
          loadTemplates();
        },
      },
    ]);
  };

  const renderTemplate = ({ item }) => (
    <Card style={[styles.templateCard, { marginBottom: spacing.sm }]}>
      <View style={styles.templateRow}>
        <View style={[styles.typeIndicator, { backgroundColor: item.type === 'income' ? colors.income : colors.expense }]} />
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: colors.textPrimary, fontWeight: fontWeight.medium }]}>
            {item.name}
          </Text>
          <Text style={[styles.templateMeta, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
            {item.type === 'income' ? 'Income' : 'Expense'}
            {item.amount ? ` • ₱${item.amount.toLocaleString()}` : ''}
            {item.category ? ` • ${item.category}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Delete template"
        >
          <Icon name="delete-outline" size={20} color={colors.expense} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {templates.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Templates"
          message="Save transaction templates for quick entry of frequent transactions."
        />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={{ padding: spacing.base }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.cardElevated }]}
        onPress={() => setShowAddModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Add template"
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Template Modal */}
      <Modal
        visible={showAddModal}
        title="New Template"
        onConfirm={handleAdd}
        onCancel={() => {
          setShowAddModal(false);
          setFormError('');
        }}
        confirmText="Save"
        cancelText="Cancel"
      >
        <Input
          label="Template Name"
          value={formName}
          onChangeText={(t) => { setFormName(t); setFormError(''); }}
          placeholder="e.g. Daily Coffee"
          error={formError}
          style={{ marginBottom: spacing.sm }}
        />
        <Input
          label="Amount (optional)"
          value={formAmount}
          onChangeText={setFormAmount}
          placeholder="0.00"
          keyboardType="numeric"
          style={{ marginBottom: spacing.sm }}
        />
        <Input
          label="Category Name (optional)"
          value={formCategory}
          onChangeText={setFormCategory}
          placeholder="e.g. Food & Dining"
          style={{ marginBottom: spacing.sm }}
        />
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, formType === 'expense' && { backgroundColor: colors.expense }]}
            onPress={() => setFormType('expense')}
          >
            <Text style={[styles.typeButtonText, { color: formType === 'expense' ? '#FFF' : colors.textSecondary }]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, formType === 'income' && { backgroundColor: colors.income }]}
            onPress={() => setFormType('income')}
          >
            <Text style={[styles.typeButtonText, { color: formType === 'income' ? '#FFF' : colors.textSecondary }]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  templateCard: {},
  templateRow: { flexDirection: 'row', alignItems: 'center' },
  typeIndicator: { width: 4, height: 32, borderRadius: 2, marginRight: 12 },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, marginBottom: 2 },
  templateMeta: {},
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
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
