import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// Required for Google auth session to work properly
WebBrowser.maybeCompleteAuthSession();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const { login, register, loading, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleLogin(response.authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleLogin = async (googleAccessToken) => {
    if (!googleAccessToken) return;
    setGoogleLoading(true);
    setServerError('');
    try {
      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      const googleUser = await userInfoResponse.json();

      // Try to log in with Google email — if user doesn't exist, register them
      try {
        await login(googleUser.email, `google_oauth_${googleUser.id}`);
      } catch {
        // User doesn't exist yet — register them with Google info
        try {
          await register(
            googleUser.name || googleUser.email.split('@')[0],
            googleUser.email,
            `google_oauth_${googleUser.id}`
          );
        } catch (regErr) {
          // If duplicate email, the user exists but with a different password — try login error
          const message = regErr.response?.data?.error?.message || 'Google login failed';
          if (message.includes('already exists')) {
            setServerError('This email is already registered. Please use email/password to login.');
          } else {
            setServerError(message);
          }
        }
      }
    } catch (err) {
      setServerError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

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
            Quorax
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

          {/* Error message above login button */}
          {serverError ? (
            <Text
              style={[
                styles.loginError,
                { color: colors.expense, fontSize: fontSize.sm, marginTop: spacing.sm },
              ]}
              accessibilityRole="alert"
            >
              {serverError}
            </Text>
          ) : null}

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={{ marginTop: spacing.sm }}
          />

          {/* Forgot Password Link (Feature #4) */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={{ marginTop: spacing.md, alignItems: 'center' }}
            accessibilityRole="link"
            accessibilityLabel="Forgot Password"
          >
            <Text style={[{ color: colors.primary, fontSize: fontSize.sm }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* OR Divider */}
          <View style={[styles.orDivider, { marginTop: spacing.lg }]}>
            <View style={[styles.orLine, { backgroundColor: colors.textSecondary + '30' }]} />
            <Text style={[styles.orText, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
              or
            </Text>
            <View style={[styles.orLine, { backgroundColor: colors.textSecondary + '30' }]} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.textSecondary + '40',
                backgroundColor: colors.card,
                marginTop: spacing.lg,
                paddingVertical: 14,
              },
            ]}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading || loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            <Text style={[styles.googleIcon]}>G</Text>
            <Text style={[styles.googleText, { color: colors.textPrimary }]}>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>
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

        {/* Privacy Policy Link */}
        <TouchableOpacity
          style={[styles.privacyLink, { marginTop: spacing.md }]}
          onPress={() => {
            import('expo-web-browser').then((WebBrowser) => {
              // Opens in-app browser or you can navigate to a screen
            });
            // For now, show an alert with key points
            Alert.alert(
              'Privacy Policy',
              'Quorax respects your privacy. We only collect data needed to provide the service (email, financial records). We never sell your data to third parties. Your passwords are encrypted and all communication uses HTTPS.\n\nFull policy available in Settings → Privacy Policy.',
              [{ text: 'OK' }]
            );
          }}
          accessibilityRole="link"
          accessibilityLabel="View privacy policy"
        >
          <Text style={[styles.privacyText, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
            By continuing, you agree to our{' '}
            <Text style={{ color: colors.primary }}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>
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
  loginError: {
    textAlign: 'center',
    fontWeight: '500',
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
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 12,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '500',
  },
  privacyLink: {
    alignItems: 'center',
  },
  privacyText: {
    textAlign: 'center',
  },
});
