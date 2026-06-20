/**
 * Jest setup file for SpendWise client tests.
 * Mocks native modules and provides theme context.
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// react-native-vector-icons is handled via moduleNameMapper in jest.config.js
