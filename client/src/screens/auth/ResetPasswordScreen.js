/**
 * ResetPasswordScreen (Feature #4)
 * Accepts OTP code + new password to complete password reset.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { apiClient } from '../../api/client';

export default function ResetPasswordScreen({ navigation, route }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const emailFromRoute = route?.params?.email || '';

  const [email, setEmail] = useState(emailFromRoute);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = useCallback(async () => {
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (!code.trim()) { setError('Reset code is required'); return; }
    if (code.trim().length !== 6) { setError('Code must be 6 digits'); return; }
    if (!newPassword) { setError('New password is required'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });

      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. Please log in with your new password.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid or expired reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, code, newPassword, confirmPassword, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary, fontWeight: fontWeight.bold, fontSize: fontSize.xl }]}>
            Reset Password
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm }]}>
            Enter the 6-digit code sent to your email and set a new password.
          </Text>
        </View>

        <View style={[styles.form, { marginTop: spacing.xl, gap: spacing.base }]}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.expense + '12', borderRadius: 8, padding: spacing.md }]}>
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(''); }}
            placeholder="Your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="6-Digit Code"
            value={code}
            onChangeText={(text) => { setCode(text.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
            placeholder="Enter reset code"
            keyboardType="number-pad"
            maxLength={6}
          />

          <Input
            label="New Password"
            value={newPassword}
            onChangeText={(text) => { setNewPassword(text); setError(''); }}
            placeholder="At least 8 characters"
            secureTextEntry
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => { setConfirmPassword(text); setError(''); }}
            placeholder="Confirm new password"
            secureTextEntry
          />

          <Button
            title="Reset Password"
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center' },
  title: {},
  subtitle: { textAlign: 'center' },
  form: { width: '100%' },
  errorBanner: {},
  errorText: { fontSize: 14, textAlign: 'center' },
});
