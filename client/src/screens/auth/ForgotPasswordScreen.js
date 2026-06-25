/**
 * ForgotPasswordScreen (Feature #4)
 * Allows users to request a password reset OTP by email.
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccess(true);
      Alert.alert(
        'Check Your Email',
        'If this email is registered, a reset code has been sent. Check your console/email for the 6-digit code.',
        [{ text: 'Enter Code', onPress: () => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() }) }]
      );
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, navigation]);

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
            Forgot Password?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.sm }]}>
            Enter your email address and we'll send you a code to reset your password.
          </Text>
        </View>

        <View style={[styles.form, { marginTop: spacing.xl }]}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.expense + '12', borderRadius: 8, padding: spacing.md, marginBottom: spacing.base }]}>
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.successBanner, { backgroundColor: colors.income + '12', borderRadius: 8, padding: spacing.md, marginBottom: spacing.base }]}>
              <Text style={[styles.successText, { color: colors.income }]}>
                Reset code sent! Check your email.
              </Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(''); }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title={success ? 'Resend Code' : 'Send Reset Code'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={{ marginTop: spacing.lg }}
          />

          {success && (
            <Button
              title="Enter Reset Code"
              onPress={() => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() })}
              variant="outline"
              style={{ marginTop: spacing.md }}
            />
          )}
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
  successBanner: {},
  successText: { fontSize: 14, textAlign: 'center' },
});
