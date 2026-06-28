/**
 * ChangePasswordScreen
 * Allows authenticated users to change their password via email verification.
 * Flow: Enter new password → request code → enter code → confirm change.
 */

import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ChangePasswordScreen({ navigation }) {
  const { colors, spacing, fontSize } = useTheme();
  const { user } = useAuth();

  const [step, setStep] = useState(1); // 1 = enter new password, 2 = enter code
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    setError('');

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/request-password-change', { newPassword });
      setStep(2);
      Alert.alert('Code Sent', `A 6-digit verification code has been sent to ${user?.email}.`);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to request code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChange = async () => {
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/confirm-password-change', { code, newPassword });
      Alert.alert('Success', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {step === 1 ? 'Set New Password' : 'Enter Verification Code'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
          {step === 1
            ? 'Enter your new password. We\'ll send a verification code to your email.'
            : `Enter the 6-digit code sent to ${user?.email}.`}
        </Text>

        {step === 1 ? (
          <>
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setError(''); }}
              placeholder="At least 8 characters"
              secureTextEntry
              style={{ marginBottom: spacing.base }}
            />
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              placeholder="Repeat new password"
              secureTextEntry
              style={{ marginBottom: spacing.base }}
            />
          </>
        ) : (
          <Input
            label="Verification Code"
            value={code}
            onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            style={{ marginBottom: spacing.base }}
          />
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.expense, fontSize: fontSize.sm }]}>
            {error}
          </Text>
        ) : null}

        <Button
          title={step === 1 ? 'Send Verification Code' : 'Change Password'}
          onPress={step === 1 ? handleRequestCode : handleConfirmChange}
          loading={loading}
          disabled={loading}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  error: { textAlign: 'center', marginBottom: 8 },
});
