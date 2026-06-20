module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios|expo|expo-secure-store|expo-modules-core|@expo|react-native|@react-native|react-native-vector-icons|@react-native-async-storage)/)',
  ],
  moduleNameMapper: {
    '^react-native-vector-icons/(.*)$': '<rootDir>/__mocks__/react-native-vector-icons.js',
    '^@expo/vector-icons/(.*)$': '<rootDir>/__mocks__/react-native-vector-icons.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/react-native-vector-icons.js',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['./jest.setup.js'],
};
