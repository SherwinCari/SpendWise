/**
 * SpendWise Category Management Screen
 * Two tabs for Income and Expense categories.
 * Supports add, edit, delete with icon and color pickers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useCategories } from '../../context/CategoryContext';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Predefined icon options for categories
const ICON_OPTIONS = [
  'food', 'cart', 'car', 'bus', 'train', 'airplane',
  'home', 'flash', 'water', 'wifi', 'phone', 'laptop',
  'gamepad-variant', 'movie', 'music', 'book-open-variant',
  'medical-bag', 'dumbbell', 'school', 'briefcase',
  'gift', 'shopping', 'tshirt-crew', 'hanger',
  'cash', 'bank', 'credit-card', 'chart-line',
  'heart', 'star', 'tag', 'folder',
];

// Predefined color options for categories
const COLOR_OPTIONS = [
  '#0D9488', '#10B981', '#06B6D4', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#EC4899', '#EF4444', '#F97316',
  '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#14B8A6',
  '#64748B',
];

function CategoryManagementScreen() {
  const { colors, spacing, borderRadius, typography, fontSize, fontWeight, shadows } = useTheme();
  const {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [activeTab, setActiveTab] = useState('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const currentCategories = categories[activeTab] || [];

  const resetForm = useCallback(() => {
    setName('');
    setSelectedIcon('folder');
    setSelectedColor(COLOR_OPTIONS[0]);
    setFormError('');
    setEditingCategory(null);
  }, []);

  const handleOpenAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setSelectedIcon(category.icon || 'folder');
    setSelectedColor(category.color || COLOR_OPTIONS[0]);
    setFormError('');
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Category name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: trimmedName,
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await createCategory({
          name: trimmedName,
          type: activeTab,
          icon: selectedIcon,
          color: selectedColor,
        });
      }
      handleCloseModal();
    } catch (err) {
      const message = err.response?.data?.error?.message || err.userMessage || 'Something went wrong';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (category) => {
    setCategoryToDelete(category);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete.id);
      setDeleteModalVisible(false);
      setCategoryToDelete(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete category. Please try again.');
      setDeleteModalVisible(false);
      setCategoryToDelete(null);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.card,
          padding: spacing.base,
          marginBottom: spacing.sm,
        },
        shadows.card,
      ]}
      onPress={() => handleOpenEditModal(item)}
      accessibilityRole="button"
      accessibilityLabel={`Edit category ${item.name}`}
    >
      <View style={styles.categoryItemLeft}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: (item.color || colors.primary) + '20',
              borderRadius: borderRadius.button,
            },
          ]}
        >
          <Icon
            name={item.icon || 'folder'}
            size={22}
            color={item.color || colors.primary}
          />
        </View>
        <Text
          style={[
            typography.body,
            { color: colors.textPrimary, marginLeft: spacing.md, fontWeight: fontWeight.medium },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
      <View style={styles.categoryItemRight}>
        <View
          style={[
            styles.colorDot,
            { backgroundColor: item.color || colors.primary },
          ]}
        />
        <TouchableOpacity
          onPress={() => handleOpenDeleteModal(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Delete category ${item.name}`}
        >
          <Icon name="delete-outline" size={20} color={colors.expense} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderIconPicker = () => (
    <View style={{ marginTop: spacing.base }}>
      <Text
        style={[
          typography.label,
          { color: colors.textPrimary, marginBottom: spacing.sm },
        ]}
      >
        Icon
      </Text>
      <View style={styles.pickerGrid}>
        {ICON_OPTIONS.map((iconName) => (
          <TouchableOpacity
            key={iconName}
            style={[
              styles.pickerItem,
              {
                backgroundColor:
                  selectedIcon === iconName
                    ? colors.primary + '20'
                    : colors.background,
                borderRadius: borderRadius.button,
                borderWidth: selectedIcon === iconName ? 2 : 1,
                borderColor:
                  selectedIcon === iconName
                    ? colors.primary
                    : colors.textSecondary + '30',
              },
            ]}
            onPress={() => setSelectedIcon(iconName)}
            accessibilityRole="button"
            accessibilityLabel={`Select icon ${iconName}`}
            accessibilityState={{ selected: selectedIcon === iconName }}
          >
            <Icon
              name={iconName}
              size={20}
              color={selectedIcon === iconName ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderColorPicker = () => (
    <View style={{ marginTop: spacing.base }}>
      <Text
        style={[
          typography.label,
          { color: colors.textPrimary, marginBottom: spacing.sm },
        ]}
      >
        Color
      </Text>
      <View style={styles.pickerGrid}>
        {COLOR_OPTIONS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorPickerItem,
              {
                backgroundColor: color,
                borderRadius: 20,
                borderWidth: selectedColor === color ? 3 : 0,
                borderColor: colors.textPrimary,
              },
            ]}
            onPress={() => setSelectedColor(color)}
            accessibilityRole="button"
            accessibilityLabel={`Select color ${color}`}
            accessibilityState={{ selected: selectedColor === color }}
          >
            {selectedColor === color && (
              <Icon name="check" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selector */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.button,
            padding: spacing.xs,
            margin: spacing.base,
          },
          shadows.card,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor: activeTab === 'expense' ? colors.primary : 'transparent',
              borderRadius: borderRadius.button - 2,
              paddingVertical: spacing.md,
            },
          ]}
          onPress={() => setActiveTab('expense')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'expense' }}
          accessibilityLabel="Expense categories tab"
        >
          <Text
            style={[
              typography.label,
              {
                color: activeTab === 'expense' ? '#FFFFFF' : colors.textSecondary,
              },
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor: activeTab === 'income' ? colors.primary : 'transparent',
              borderRadius: borderRadius.button - 2,
              paddingVertical: spacing.md,
            },
          ]}
          onPress={() => setActiveTab('income')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'income' }}
          accessibilityLabel="Income categories tab"
        >
          <Text
            style={[
              typography.label,
              {
                color: activeTab === 'income' ? '#FFFFFF' : colors.textSecondary,
              },
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category List */}
      {loading && currentCategories.length === 0 ? (
        <LoadingSpinner message="Loading categories..." />
      ) : currentCategories.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} categories`}
          message={`Add your first ${activeTab} category to get started.`}
          icon="📁"
          action={
            <Button
              title="Add Category"
              onPress={handleOpenAddModal}
              variant="primary"
            />
          }
        />
      ) : (
        <FlatList
          data={currentCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Category FAB */}
      {currentCategories.length > 0 && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              borderRadius: 28,
            },
            shadows.button,
          ]}
          onPress={handleOpenAddModal}
          accessibilityRole="button"
          accessibilityLabel={`Add ${activeTab} category`}
        >
          <Icon name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        onCancel={handleCloseModal}
        onConfirm={handleSave}
        confirmText={editingCategory ? 'Save' : 'Create'}
        cancelText="Cancel"
        confirmLoading={saving}
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <Input
            label="Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (formError) setFormError('');
            }}
            placeholder="Category name"
            error={formError}
          />
          <View style={{ marginTop: spacing.sm }}>
            <Text
              style={[
                typography.label,
                { color: colors.textSecondary },
              ]}
            >
              Type: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Text>
          </View>
          {renderIconPicker()}
          {renderColorPicker()}
        </ScrollView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        title="Delete Category"
        message={
          categoryToDelete
            ? `Are you sure you want to delete "${categoryToDelete.name}"? All transactions using this category will be reassigned to "Uncategorized".`
            : ''
        }
        onCancel={() => {
          setDeleteModalVisible(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerItem: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerItem: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});

export default CategoryManagementScreen;
