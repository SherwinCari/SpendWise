/**
 * TransactionForm Component
 * Form for adding or editing a transaction.
 * Includes type toggle, amount input, category picker, wallet picker,
 * date picker, and description field.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme';

/**
 * @param {object} props
 * @param {object} [props.initialValues] - Pre-filled values for edit mode
 * @param {Array} props.categories - Available categories [{id, name, type, icon, color}]
 * @param {Array} props.wallets - Available wallets [{id, name, balance}]
 * @param {function} props.onSubmit - Called with form data on submit
 * @param {function} [props.onCancel] - Called when cancel is pressed
 * @param {boolean} [props.isLoading] - Disables form when true
 * @param {string} [props.submitLabel] - Custom submit button text (default: "Add Transaction")
 */
export default function TransactionForm({
  initialValues,
  categories = [],
  wallets = [],
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel,
}) {
  const { colors, spacing, borderRadius, shadows, fontSize, fontWeight } = useTheme();

  const [type, setType] = useState(initialValues?.type || 'expense');
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '');
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId || null);
  const [walletId, setWalletId] = useState(initialValues?.walletId || null);
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(initialValues?.description || '');
  const [errors, setErrors] = useState({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);

  // Filter categories based on selected type
  const filteredCategories = categories.filter((cat) => cat.type === type);
  const selectedCategory = categories.find((cat) => cat.id === categoryId);
  const selectedWallet = wallets.find((w) => w.id === walletId);

  // Reset category when type changes if current category doesn't match
  useEffect(() => {
    if (categoryId && selectedCategory && selectedCategory.type !== type) {
      setCategoryId(null);
    }
  }, [type]);

  function validate() {
    const newErrors = {};
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }
    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }
    if (!walletId) {
      newErrors.wallet = 'Please select a wallet';
    }
    if (!date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      categoryId,
      walletId,
      date,
      description: description.trim() || null,
    });
  }

  function handleAmountChange(text) {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length <= 2) {
      const formatted = parts.length === 2 ? `${parts[0]}.${parts[1].slice(0, 2)}` : cleaned;
      setAmount(formatted);
    }
  }

  // Photo Receipt (Feature #21)
  async function handlePickReceipt() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setReceiptImage(result.assets[0].uri);
    }
  }

  async function handleTakePhoto() {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setReceiptImage(result.assets[0].uri);
    }
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Type Toggle */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Type
        </Text>
        <View style={[styles.typeToggle, { backgroundColor: colors.background, borderRadius: borderRadius.button }]}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              { borderRadius: borderRadius.button },
              type === 'expense' && { backgroundColor: colors.expense },
            ]}
            onPress={() => setType('expense')}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'expense' }}
            accessibilityLabel="Expense"
          >
            <Icon name="arrow-up-circle" size={18} color={type === 'expense' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.typeText, { color: type === 'expense' ? '#FFFFFF' : colors.textSecondary, fontWeight: fontWeight.medium }]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeOption,
              { borderRadius: borderRadius.button },
              type === 'income' && { backgroundColor: colors.income },
            ]}
            onPress={() => setType('income')}
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'income' }}
            accessibilityLabel="Income"
          >
            <Icon name="arrow-down-circle" size={18} color={type === 'income' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.typeText, { color: type === 'income' ? '#FFFFFF' : colors.textSecondary, fontWeight: fontWeight.medium }]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Amount
        </Text>
        <View style={[styles.amountRow, { borderColor: errors.amount ? colors.expense : colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.card }]}>
          <Text style={[styles.currencySymbol, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>₱</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            accessibilityLabel="Transaction amount"
          />
        </View>
        {errors.amount && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.amount}</Text>}
      </View>

      {/* Category Picker */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Category
        </Text>
        <TouchableOpacity
          style={[styles.pickerButton, { borderColor: errors.category ? colors.expense : colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.card }]}
          onPress={() => setShowCategoryPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select category"
        >
          {selectedCategory ? (
            <View style={styles.pickerValue}>
              <Icon name={selectedCategory.icon || 'tag'} size={20} color={selectedCategory.color || colors.primary} />
              <Text style={[styles.pickerText, { color: colors.textPrimary, fontSize: fontSize.base }]}>
                {selectedCategory.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.pickerText, { color: colors.textSecondary, fontSize: fontSize.base }]}>
              Select a category
            </Text>
          )}
          <Icon name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {errors.category && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.category}</Text>}
      </View>

      {/* Wallet Picker */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Wallet
        </Text>
        <TouchableOpacity
          style={[styles.pickerButton, { borderColor: errors.wallet ? colors.expense : colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.card }]}
          onPress={() => setShowWalletPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select wallet"
        >
          {selectedWallet ? (
            <View style={styles.pickerValue}>
              <Icon name="wallet" size={20} color={colors.primary} />
              <Text style={[styles.pickerText, { color: colors.textPrimary, fontSize: fontSize.base }]}>
                {selectedWallet.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.pickerText, { color: colors.textSecondary, fontSize: fontSize.base }]}>
              Select a wallet
            </Text>
          )}
          <Icon name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {errors.wallet && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.wallet}</Text>}
      </View>

      {/* Date Picker */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Date
        </Text>
        <TouchableOpacity
          style={[styles.dateRow, { borderColor: errors.date ? colors.expense : colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.card }]}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select date"
        >
          <Icon name="calendar" size={20} color={colors.primary} style={styles.dateIcon} />
          <Text style={[styles.dateInput, { color: date ? colors.textPrimary : colors.textSecondary, fontSize: fontSize.base }]}>
            {date || 'Select a date'}
          </Text>
        </TouchableOpacity>
        {errors.date && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.date}</Text>}
        {showDatePicker && (
          <DateTimePicker
            value={date ? new Date(date + 'T00:00:00') : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'set' && selectedDate) {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const day = String(selectedDate.getDate()).padStart(2, '0');
                setDate(`${year}-${month}-${day}`);
              }
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Description (optional)
        </Text>
        <TextInput
          style={[styles.textArea, { borderColor: colors.textSecondary + '40', borderRadius: borderRadius.input, backgroundColor: colors.card, color: colors.textPrimary, fontSize: fontSize.base }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add a note..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Transaction description"
        />
      </View>

      {/* Receipt Photo (Feature #21) */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
          Receipt (optional)
        </Text>
        <View style={styles.receiptRow}>
          <TouchableOpacity
            style={[styles.receiptButton, { borderColor: colors.primary + '60', borderRadius: borderRadius.input, backgroundColor: colors.card }]}
            onPress={handleTakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take photo of receipt"
          >
            <Icon name="camera" size={20} color={colors.primary} />
            <Text style={[{ color: colors.primary, fontSize: fontSize.xs, marginTop: 4 }]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.receiptButton, { borderColor: colors.primary + '60', borderRadius: borderRadius.input, backgroundColor: colors.card }]}
            onPress={handlePickReceipt}
            accessibilityRole="button"
            accessibilityLabel="Pick receipt from gallery"
          >
            <Icon name="image" size={20} color={colors.primary} />
            <Text style={[{ color: colors.primary, fontSize: fontSize.xs, marginTop: 4 }]}>Gallery</Text>
          </TouchableOpacity>
        </View>
        {receiptImage && (
          <View style={styles.receiptPreview}>
            <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
            <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceipt}>
              <Icon name="close-circle" size={24} color={colors.expense} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.textSecondary + '40', borderRadius: borderRadius.button }]}
            onPress={onCancel}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary, fontWeight: fontWeight.medium }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary, borderRadius: borderRadius.button, ...shadows.button },
            isLoading && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={submitLabel || 'Add Transaction'}
        >
          <Text style={[styles.submitText, { fontWeight: fontWeight.semiBold }]}>
            {isLoading ? 'Saving...' : (submitLabel || 'Add Transaction')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        title="Select Category"
        items={filteredCategories}
        selectedId={categoryId}
        onSelect={(id) => { setCategoryId(id); setShowCategoryPicker(false); }}
        onClose={() => setShowCategoryPicker(false)}
        renderItem={(item) => (
          <View style={styles.pickerItemRow}>
            <Icon name={item.icon || 'tag'} size={20} color={item.color || colors.primary} />
            <Text style={[styles.pickerItemText, { color: colors.textPrimary, fontSize: fontSize.base }]}>
              {item.name}
            </Text>
          </View>
        )}
        emptyText={`No ${type} categories available`}
        colors={colors}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />

      {/* Wallet Picker Modal */}
      <PickerModal
        visible={showWalletPicker}
        title="Select Wallet"
        items={wallets}
        selectedId={walletId}
        onSelect={(id) => { setWalletId(id); setShowWalletPicker(false); }}
        onClose={() => setShowWalletPicker(false)}
        renderItem={(item) => (
          <View style={styles.pickerItemRow}>
            <Icon name="wallet" size={20} color={colors.primary} />
            <Text style={[styles.pickerItemText, { color: colors.textPrimary, fontSize: fontSize.base }]}>
              {item.name}
            </Text>
            <Text style={[styles.pickerItemBalance, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
              ₱{parseFloat(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}
        emptyText="No wallets available"
        colors={colors}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />
    </ScrollView>
  );
}

/**
 * Reusable picker modal for selecting from a list
 */
function PickerModal({ visible, title, items, selectedId, onSelect, onClose, renderItem, emptyText, colors, borderRadius, fontSize, fontWeight }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderTopLeftRadius: borderRadius.modal, borderTopRightRadius: borderRadius.modal }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semiBold }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {items.length === 0 ? (
            <View style={styles.emptyPicker}>
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: fontSize.base }]}>
                {emptyText}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedId === item.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => onSelect(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedId === item.id }}
                >
                  {renderItem(item)}
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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    padding: 4,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  currencySymbol: {
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    padding: 0,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerText: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 6,
  },
  textArea: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
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
  pickerItemBalance: {
    marginLeft: 'auto',
  },
  emptyPicker: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {},
  // Receipt styles (Feature #21)
  receiptRow: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  receiptPreview: {
    marginTop: 12,
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeReceipt: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
