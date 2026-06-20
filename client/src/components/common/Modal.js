/**
 * SpendWise Modal Component
 * Confirmation/action modal with backdrop overlay.
 */

import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme';

function Modal({
  visible = false,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  confirmLoading = false,
  children,
}) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();

  const getConfirmColor = () => {
    switch (confirmVariant) {
      case 'danger':
        return colors.expense;
      case 'primary':
      default:
        return colors.primary;
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <TouchableWithoutFeedback onPress={onCancel} accessibilityRole="none">
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.content,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.modal,
                  padding: spacing.lg,
                },
                shadows.cardElevated,
              ]}
            >
              {title && (
                <Text
                  style={[
                    typography.h3,
                    { color: colors.textPrimary, marginBottom: spacing.sm },
                  ]}
                >
                  {title}
                </Text>
              )}
              {message && (
                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, marginBottom: spacing.lg },
                  ]}
                >
                  {message}
                </Text>
              )}
              {children}
              <View style={[styles.actions, { marginTop: spacing.base }]}>
                {onCancel && (
                  <TouchableOpacity
                    onPress={onCancel}
                    style={[
                      styles.button,
                      {
                        borderRadius: borderRadius.button,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.base,
                        borderWidth: 1.5,
                        borderColor: colors.textSecondary + '40',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={cancelText}
                  >
                    <Text
                      style={[
                        typography.label,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                {onConfirm && (
                  <TouchableOpacity
                    onPress={onConfirm}
                    disabled={confirmLoading}
                    style={[
                      styles.button,
                      {
                        borderRadius: borderRadius.button,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.base,
                        backgroundColor: confirmLoading ? colors.textSecondary : getConfirmColor(),
                        marginLeft: spacing.sm,
                        opacity: confirmLoading ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={confirmText}
                    accessibilityState={{ disabled: confirmLoading }}
                  >
                    {confirmLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[typography.label, { color: '#FFFFFF' }]}>
                        {confirmText}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});

export default Modal;
