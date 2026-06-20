/**
 * Unit tests for API client interceptors.
 *
 * Tests focus on:
 * 1. Request interceptor: attaches Bearer token from SecureStore
 * 2. Request interceptor: no token when store is empty
 * 3. Response interceptor: 401 triggers refresh with stored refresh token, retries request
 * 4. Response interceptor: refresh failure clears tokens and calls session expired handler
 * 5. Response interceptor: non-401 errors pass through unchanged
 *
 * Validates: Requirements 2.6, 2.7, 2.8
 */

// In-memory SecureStore mock
const mockSecureStoreData = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(mockSecureStoreData[key] || null)),
  setItemAsync: jest.fn((key, value) => {
    mockSecureStoreData[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    delete mockSecureStoreData[key];
    return Promise.resolve();
  }),
}));

// Capture interceptor handlers
let mockRequestInterceptorFn = null;
let mockResponseSuccessFn = null;
let mockResponseErrorFn = null;

const mockAxiosInstance = {
  interceptors: {
    request: {
      use: jest.fn((onFulfilled) => {
        mockRequestInterceptorFn = onFulfilled;
      }),
    },
    response: {
      use: jest.fn((onFulfilled, onRejected) => {
        mockResponseSuccessFn = onFulfilled;
        mockResponseErrorFn = onRejected;
      }),
    },
  },
  defaults: { headers: { common: {} } },
};

// Make instance callable for retry logic
const mockCallableInstance = Object.assign(
  jest.fn((config) => Promise.resolve({ data: { success: true } })),
  mockAxiosInstance
);

jest.mock('axios', () => ({
  create: jest.fn(() => mockCallableInstance),
  post: jest.fn(),
}));

const SecureStore = require('expo-secure-store');
const axios = require('axios');

// Import triggers interceptor registration
const clientModule = require('../../src/api/client');

function clearStore() {
  Object.keys(mockSecureStoreData).forEach((key) => delete mockSecureStoreData[key]);
}

describe('API Client Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallableInstance.mockClear();
    clearStore();
  });

  describe('Request interceptor', () => {
    it('attaches Bearer token from SecureStore when token exists', async () => {
      mockSecureStoreData['spendwise_access_token'] = 'test-jwt-token';

      const config = { headers: {} };
      const result = await mockRequestInterceptorFn(config);

      expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('spendwise_access_token');
    });

    it('does not attach Authorization header when SecureStore is empty', async () => {
      const config = { headers: {} };
      const result = await mockRequestInterceptorFn(config);

      expect(result.headers.Authorization).toBeUndefined();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('spendwise_access_token');
    });
  });

  describe('Response interceptor — 401 with token refresh', () => {
    it('on 401, refreshes token using stored refresh token and retries original request', async () => {
      mockSecureStoreData['spendwise_refresh_token'] = 'stored-refresh-token';

      // Mock successful refresh
      axios.post.mockResolvedValueOnce({
        data: {
          accessToken: 'refreshed-access-token',
          refreshToken: 'rotated-refresh-token',
        },
      });

      // Mock successful retry
      mockCallableInstance.mockResolvedValueOnce({ data: { result: 'retried' } });

      const error = {
        response: { status: 401 },
        config: { _retry: false, url: '/transactions', headers: {} },
      };

      const result = await mockResponseErrorFn(error);

      // Verify refresh endpoint was called with stored refresh token
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refreshToken: 'stored-refresh-token' }
      );

      // Verify new tokens stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'spendwise_access_token',
        'refreshed-access-token'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'spendwise_refresh_token',
        'rotated-refresh-token'
      );

      // Verify original request was retried with new token
      expect(mockCallableInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer refreshed-access-token',
          }),
        })
      );
    });
  });

  describe('Response interceptor — refresh failure', () => {
    it('clears tokens and calls session expired handler on refresh failure', async () => {
      mockSecureStoreData['spendwise_refresh_token'] = 'bad-refresh-token';

      const mockSessionExpiredHandler = jest.fn();
      clientModule.setSessionExpiredHandler(mockSessionExpiredHandler);

      // Mock refresh failure
      axios.post.mockRejectedValueOnce(new Error('Token expired'));

      const error = {
        response: { status: 401 },
        config: { _retry: false, url: '/budgets', headers: {} },
      };

      await expect(mockResponseErrorFn(error)).rejects.toThrow('Token expired');

      // Tokens cleared
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('spendwise_access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('spendwise_refresh_token');

      // Session expired callback invoked (redirects to login)
      expect(mockSessionExpiredHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response interceptor — non-401 errors', () => {
    it('passes through non-401 errors without attempting refresh', async () => {
      const error = {
        response: { status: 500 },
        config: { _retry: false, url: '/wallets' },
      };

      await expect(mockResponseErrorFn(error)).rejects.toEqual(error);

      // No refresh attempt
      expect(axios.post).not.toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('passes through 403 errors without attempting refresh', async () => {
      const error = {
        response: { status: 403 },
        config: { _retry: false, url: '/analytics' },
      };

      await expect(mockResponseErrorFn(error)).rejects.toEqual(error);
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
