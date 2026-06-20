import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { colors, spacing, typography, fontSize, fontWeight } = useTheme();
  const { login, loading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const validate = useCallback(() => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    setServerError('');
    clearError();

    if (!validate()) return;

    try {
      await login(email.trim(), password);
      // Navigation to MainTabs is automatic via RootNavigator when isAuthenticated becomes true
    } catch (err) {
      const message =
        err.response?.data?.error?.message || 'Invalid credentials';
      setServerError(message);
    }
  }, [email, password, validate, login, clearError]);

  const handleEmailChange = useCallback((text) => {
    setEmail(text);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: '' }));
    }
    if (serverError) setServerError('');
  }, [fieldErrors.email, serverError]);

  const handlePasswordChange = useCallback((text) => {
    setPassword(text);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: '' }));
    }
    if (serverError) setServerError('');
  }, [fieldErrors.password, serverError]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* App Logo / Branding */}
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <Text style={[styles.logoIcon, { color: colors.primary }]}>💰</Text>
          </View>
          <Text
            style={[
              styles.appName,
              { color: colors.textPrimary, fontWeight: fontWeight.bold },
            ]}
          >
            SpendWise
          </Text>
          <Text
            style={[
              styles.tagline,
              { color: colors.textSecondary, fontSize: fontSize.sm },
            ]}
          >
            Track your expenses, grow your wealth
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.form, { gap: spacing.base }]}>
          {/* Server Error */}
          {serverError ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.expense + '12',
                  borderRadius: 8,
                  padding: spacing.md,
                },
              ]}
              accessibilityRole="alert"
            >
              <Text style={[styles.errorBannerText, { color: colors.expense }]}>
                {serverError}
              </Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Enter your password"
            secureTextEntry
            error={fieldErrors.password}
          />

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Register Link */}
        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="link"
            accessibilityLabel="Navigate to register screen"
          >
            <Text style={[styles.registerLink, { color: colors.primary }]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 36,
  },
  appName: {
    fontSize: 28,
    marginBottom: 4,
  },
  tagline: {
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  errorBanner: {
    width: '100%',
  },
  errorBannerText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
