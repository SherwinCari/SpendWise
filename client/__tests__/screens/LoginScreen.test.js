/**
 * LoginScreen Component Tests
 * Validates: Requirements 1.1, 2.1
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock the theme
jest.mock('../../src/theme/ThemeContext', () => {
  const mockTheme = {
    mode: 'light',
    isDark: false,
    colors: {
      primary: '#0D9488',
      accent: '#F59E0B',
      background: '#F8FAFC',
      card: '#FFFFFF',
      income: '#10B981',
      expense: '#EF4444',
      textPrimary: '#1E293B',
      textSecondary: '#64748B',
    },
    typography: {
      h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
      h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
      body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
      label: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    },
    fontFamily: { regular: 'System' },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 20, xl: 24, xxl: 32 },
    fontWeight: { regular: '400', medium: '500', semiBold: '600', bold: '700' },
    lineHeight: { xs: 16, sm: 20, base: 24, lg: 28, xl: 32, xxl: 40 },
    spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 },
    borderRadius: { card: 12, button: 8, input: 8, modal: 12 },
    shadows: { card: {}, button: {}, cardElevated: {} },
    toggleTheme: jest.fn(),
  };

  return {
    __esModule: true,
    useTheme: () => mockTheme,
    ThemeProvider: ({ children }) => children,
    default: { Provider: ({ children }) => children },
  };
});

// Also mock theme barrel export
jest.mock('../../src/theme', () => {
  const mockTheme = {
    mode: 'light',
    isDark: false,
    colors: {
      primary: '#0D9488',
      accent: '#F59E0B',
      background: '#F8FAFC',
      card: '#FFFFFF',
      income: '#10B981',
      expense: '#EF4444',
      textPrimary: '#1E293B',
      textSecondary: '#64748B',
    },
    typography: {
      h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
      h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
      body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
      label: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    },
    fontFamily: { regular: 'System' },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 20, xl: 24, xxl: 32 },
    fontWeight: { regular: '400', medium: '500', semiBold: '600', bold: '700' },
    lineHeight: { xs: 16, sm: 20, base: 24, lg: 28, xl: 32, xxl: 40 },
    spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 },
    borderRadius: { card: 12, button: 8, input: 8, modal: 12 },
    shadows: { card: {}, button: {}, cardElevated: {} },
    toggleTheme: jest.fn(),
  };

  return {
    __esModule: true,
    useTheme: () => mockTheme,
    ThemeProvider: ({ children }) => children,
    ThemeContext: { Provider: ({ children }) => children },
    lightColors: mockTheme.colors,
    darkColors: mockTheme.colors,
    typography: mockTheme.typography,
    fontFamily: mockTheme.fontFamily,
    fontSize: mockTheme.fontSize,
    fontWeight: mockTheme.fontWeight,
    lineHeight: mockTheme.lineHeight,
    spacing: mockTheme.spacing,
    borderRadius: mockTheme.borderRadius,
    shadows: mockTheme.shadows,
  };
});

// Mock AuthContext
const mockLogin = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../src/context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import LoginScreen from '../../src/screens/auth/LoginScreen';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
  });

  it('shows validation errors for empty fields on submit', async () => {
    const { getByText, findByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Login'));

    expect(await findByText('Email is required')).toBeTruthy();
    expect(await findByText('Password is required')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Login'));

    expect(await findByText('Please enter a valid email address')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login() on valid submit', async () => {
    mockLogin.mockResolvedValueOnce({ id: '1', name: 'Test User' });

    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('shows server error message on failed login', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));

    expect(await findByText('Invalid credentials')).toBeTruthy();
  });
});
