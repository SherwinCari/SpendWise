/**
 * FilterBar Component
 * Horizontal scrollable filter chips for transaction history filtering.
 * Supports date range, category, type (income/expense), and search.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';

/**
 * @param {object} props
 * @param {object} props.filters - Current active filters
 * @param {string} [props.filters.startDate] - Start date (YYYY-MM-DD)
 * @param {string} [props.filters.endDate] - End date (YYYY-MM-DD)
 * @param {string} [props.filters.categoryId] - Selected category ID
 * @param {'income'|'expense'|null} [props.filters.type] - Selected transaction type
 * @param {string} [props.filters.search] - Search query
 * @param {function} props.onFilterChange - Called with updated filters object
 * @param {Array} [props.categories] - Available categories for the category filter [{id, name, icon, color, type}]
 */
export default function FilterBar({ filters = {}, onFilterChange, categories = [] }) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(!!filters.search);

  const hasDateFilter = filters.startDate || filters.endDate;
  const hasCategoryFilter = !!filters.categoryId;
  const hasTypeFilter = !!filters.type;
  const selectedCategory = categories.find((c) => c.id === filters.categoryId);

  function updateFilter(key, value) {
    onFilterChange({ ...filters, [key]: value });
  }

  function clearFilter(key) {
    const next = { ...filters };
    delete next[key];
    if (key === 'date') {
      delete next.startDate;
      delete next.endDate;
    }
    onFilterChange(next);
  }

  function toggleType(selectedType) {
    if (filters.type === selectedType) {
      clearFilter('type');
    } else {
      updateFilter('type', selectedType);
    }
  }

  function getDateLabel() {
    if (filters.startDate && filters.endDate) {
      return `${formatShortDate(filters.startDate)} – ${formatShortDate(filters.endDate)}`;
    }
    if (filters.startDate) return `From ${formatShortDate(filters.startDate)}`;
    if (filters.endDate) return `Until ${formatShortDate(filters.endDate)}`;
    return 'Date Range';
  }

  return (
    <View style={styles.wrapper}>
      {/* Search Bar (togglable) */}
      {showSearch && (
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderRadius: borderRadius.input, borderColor: colors.textSecondary + '30' }]}>
          <Icon name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, fontSize: fontSize.sm }]}
            value={filters.search || ''}
            onChangeText={(text) => updateFilter('search', text)}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            accessibilityLabel="Search transactions"
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => { updateFilter('search', ''); setShowSearch(false); }} accessibilityLabel="Clear search">
              <Icon name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowSearch(false)} accessibilityLabel="Close search">
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
        {/* Search Chip */}
        {!showSearch && (
          <FilterChip
            icon="magnify"
            label="Search"
            active={!!filters.search}
            onPress={() => setShowSearch(true)}
            colors={colors}
            borderRadius={borderRadius}
            fontSize={fontSize}
            fontWeight={fontWeight}
          />
        )}

        {/* Date Range Chip */}
        <FilterChip
          icon="calendar-range"
          label={getDateLabel()}
          active={hasDateFilter}
          onPress={() => setShowDatePicker(true)}
          onClear={hasDateFilter ? () => clearFilter('date') : undefined}
          colors={colors}
          borderRadius={borderRadius}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />

        {/* Category Chip */}
        <FilterChip
          icon={selectedCategory?.icon || 'tag-multiple'}
          label={selectedCategory?.name || 'Category'}
          active={hasCategoryFilter}
          onPress={() => setShowCategoryPicker(true)}
          onClear={hasCategoryFilter ? () => clearFilter('categoryId') : undefined}
          colors={colors}
          borderRadius={borderRadius}
          fontSize={fontSize}
          fontWeight={fontWeight}
          iconColor={selectedCategory?.color}
        />

        {/* Type: Income Chip */}
        <FilterChip
          icon="arrow-down-circle"
          label="Income"
          active={filters.type === 'income'}
          onPress={() => toggleType('income')}
          activeColor={colors.income}
          colors={colors}
          borderRadius={borderRadius}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />

        {/* Type: Expense Chip */}
        <FilterChip
          icon="arrow-up-circle"
          label="Expense"
          active={filters.type === 'expense'}
          onPress={() => toggleType('expense')}
          activeColor={colors.expense}
          colors={colors}
          borderRadius={borderRadius}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />
      </ScrollView>

      {/* Date Range Picker Modal */}
      <DateRangeModal
        visible={showDatePicker}
        startDate={filters.startDate || ''}
        endDate={filters.endDate || ''}
        onApply={(start, end) => {
          onFilterChange({ ...filters, startDate: start || undefined, endDate: end || undefined });
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
        colors={colors}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />

      {/* Category Picker Modal */}
      <CategoryFilterModal
        visible={showCategoryPicker}
        categories={categories}
        selectedId={filters.categoryId}
        onSelect={(id) => { updateFilter('categoryId', id); setShowCategoryPicker(false); }}
        onClose={() => setShowCategoryPicker(false)}
        colors={colors}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />
    </View>
  );
}

/**
 * Individual filter chip component
 */
function FilterChip({ icon, label, active, onPress, onClear, colors, borderRadius, fontSize, fontWeight, activeColor, iconColor }) {
  const chipBg = active ? (activeColor || colors.primary) + '15' : colors.card;
  const chipBorder = active ? (activeColor || colors.primary) : colors.textSecondary + '30';
  const textColor = active ? (activeColor || colors.primary) : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder, borderRadius: 20 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} filter`}
    >
      <Icon name={icon} size={16} color={iconColor || textColor} />
      <Text style={[styles.chipText, { color: textColor, fontSize: fontSize.xs, fontWeight: active ? fontWeight.medium : fontWeight.regular }]}>
        {label}
      </Text>
      {onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }} accessibilityLabel={`Clear ${label} filter`}>
          <Icon name="close-circle" size={14} color={textColor} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/**
 * Simple date range input modal
 */
function DateRangeModal({ visible, startDate, endDate, onApply, onClose, colors, borderRadius, fontSize, fontWeight }) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  // Sync state when modal opens
  React.useEffect(() => {
    if (visible) {
      setStart(startDate);
      setEnd(endDate);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.modal, borderTopRightRadius: borderRadius.modal }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>
              Date Range
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateInputs}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>From</Text>
              <TextInput
                style={[styles.dateTextInput, { borderColor: colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.background, color: colors.textPrimary }]}
                value={start}
                onChangeText={setStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Start date"
              />
            </View>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>To</Text>
              <TextInput
                style={[styles.dateTextInput, { borderColor: colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.background, color: colors.textPrimary }]}
                value={end}
                onChangeText={setEnd}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="End date"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary, borderRadius: borderRadius.button }]}
              onPress={() => onApply(start, end)}
              accessibilityRole="button"
              accessibilityLabel="Apply date filter"
            >
              <Text style={[styles.modalButtonText, { fontWeight: fontWeight.semiBold }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/**
 * Category selection modal for filtering
 */
function CategoryFilterModal({ visible, categories, selectedId, onSelect, onClose, colors, borderRadius, fontSize, fontWeight }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.modal, borderTopRightRadius: borderRadius.modal }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>
              Filter by Category
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {categories.length === 0 ? (
            <View style={styles.emptyPicker}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.base }}>No categories available</Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedId === item.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => onSelect(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedId === item.id }}
                >
                  <View style={styles.pickerItemRow}>
                    <Icon name={item.icon || 'tag'} size={20} color={item.color || colors.primary} />
                    <Text style={[styles.pickerItemText, { color: colors.textPrimary, fontSize: fontSize.base }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.pickerItemType, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                      {item.type}
                    </Text>
                  </View>
                  {selectedId === item.id && <Icon name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
              style={styles.pickerList}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${months[monthIndex] || parts[1]} ${parseInt(parts[2], 10)}`;
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    padding: 0,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {},
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    maxHeight: '60%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {},
  dateInputs: {
    padding: 16,
    gap: 16,
  },
  dateField: {
    gap: 6,
  },
  dateLabel: {},
  dateTextInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalActions: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pickerList: {
    paddingHorizontal: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerItemText: {},
  pickerItemType: {
    marginLeft: 'auto',
    textTransform: 'capitalize',
  },
  emptyPicker: {
    padding: 32,
    alignItems: 'center',
  },
});
