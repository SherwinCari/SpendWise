/**
 * RegisterScreen Component Tests
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
const mockRegister = jest.fn();

jest.mock('../../src/context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    register: mockRegister,
    loading: false,
    error: null,
    clearError: jest.fn(),
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

import RegisterScreen from '../../src/screens/auth/RegisterScreen';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 inputs (name, email, password, confirm password)', () => {
    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );

    expect(getByText('Full Name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
    expect(getByPlaceholderText('At least 8 characters')).toBeTruthy();
    expect(getByText('Confirm Password')).toBeTruthy();
    expect(getByPlaceholderText('Re-enter your password')).toBeTruthy();
  });

  it('shows validation for short password (less than 8 characters)', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'short');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'short');
    fireEvent.press(getByText('Register'));

    expect(await findByText('Password must be at least 8 characters')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows validation for mismatched passwords', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'different123');
    fireEvent.press(getByText('Register'));

    expect(await findByText('Passwords do not match')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls register() on valid submit', async () => {
    mockRegister.mockResolvedValueOnce({ id: '1', name: 'Test User' });

    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Register'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123');
    });
  });

  it('shows duplicate email error from server', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'DUPLICATE_ERROR',
            message: 'Email already registered',
          },
        },
      },
    });

    const { getByPlaceholderText, getByText, findByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'existing@example.com');
    fireEvent.changeText(getByPlaceholderText('At least 8 characters'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter your password'), 'password123');
    fireEvent.press(getByText('Register'));

    expect(await findByText('Email already in use')).toBeTruthy();
  });
});
