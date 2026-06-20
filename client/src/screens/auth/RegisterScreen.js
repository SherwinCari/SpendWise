import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFields({ name, email, password, confirmPassword }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = 'Name is required';
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export default function RegisterScreen({ navigation }) {
  const { colors, spacing, typography, fontSize } = useTheme();
  const { register, loading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const handleRegister = useCallback(async () => {
    setServerError('');

    const validationErrors = validateFields({ name, email, password, confirmPassword });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      await register(name.trim(), email.trim(), password);
      // Navigation to MainTabs is automatic via RootNavigator when isAuthenticated becomes true
    } catch (err) {
      const errorResponse = err.response?.data?.error;
      if (errorResponse) {
        // Handle field-level errors from server (e.g., duplicate email)
        if (errorResponse.details && Array.isArray(errorResponse.details)) {
          const fieldErrors = {};
          errorResponse.details.forEach((detail) => {
            if (detail.field) {
              fieldErrors[detail.field] = detail.message;
            }
          });
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
          }
        }
        // Handle code-based errors
        if (errorResponse.code === 'DUPLICATE_ERROR') {
          setErrors({ email: 'Email already in use' });
          return;
        }
        setServerError(errorResponse.message || 'Registration failed. Please try again.');
      } else {
        setServerError('Registration failed. Please try again.');
      }
    }
  }, [name, email, password, confirmPassword, register]);

  const handleFieldChange = useCallback((field, value, setter) => {
    setter(value);
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (serverError) {
      setServerError('');
    }
  }, [errors, serverError]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary, fontSize: fontSize.xxl, marginBottom: spacing.xs },
            ]}
          >
            Create Account
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, fontSize: fontSize.base, marginBottom: spacing.xl },
            ]}
          >
            Start managing your expenses today
          </Text>
        </View>

        {serverError ? (
          <View
            style={[
              styles.serverErrorContainer,
              { backgroundColor: colors.expense + '15', padding: spacing.md, marginBottom: spacing.base, borderRadius: 8 },
            ]}
          >
            <Text style={[styles.serverErrorText, { color: colors.expense, fontSize: fontSize.sm }]}>
              {serverError}
            </Text>
          </View>
        ) : null}

        <View style={[styles.formSection, { gap: spacing.base }]}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={(val) => handleFieldChange('name', val, setName)}
            placeholder="Enter your full name"
            error={errors.name}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={(val) => handleFieldChange('email', val, setEmail)}
            placeholder="Enter your email"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(val) => handleFieldChange('password', val, setPassword)}
            placeholder="At least 8 characters"
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(val) => handleFieldChange('confirmPassword', val, setConfirmPassword)}
            placeholder="Re-enter your password"
            error={errors.confirmPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            title="Register"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
          />
        </View>

        <View style={[styles.footerSection, { marginTop: spacing.lg }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="link"
            accessibilityLabel="Navigate to login screen"
          >
            <Text style={[styles.linkText, { color: colors.primary, fontSize: fontSize.sm }]}>
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontWeight: '400',
  },
  serverErrorContainer: {
    alignItems: 'center',
  },
  serverErrorText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  formSection: {},
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontWeight: '400',
  },
  linkText: {
    fontWeight: '600',
  },
});
