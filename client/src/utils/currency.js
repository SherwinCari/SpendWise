/**
 * Currency Utility
 * Provides currency formatting and a React hook for reading/setting the user's
 * preferred currency from AsyncStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_STORAGE_KEY = '@quorax_currency';

export const SUPPORTED_CURRENCIES = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
];

/**
 * Format a number as a currency string.
 * @param {number|string} amount
 * @param {string} currencyCode - One of the supported currency codes
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode = 'PHP') {
  const num = parseFloat(amount) || 0;
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];

  if (currencyCode === 'JPY' || currencyCode === 'KRW') {
    return `${currency.symbol}${Math.round(num).toLocaleString()}`;
  }

  return `${currency.symbol}${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * React hook that reads and sets the user's preferred currency.
 * @returns {{ currency: string, setCurrency: (code: string) => Promise<void>, loading: boolean }}
 */
export function useCurrency() {
  const [currency, setCurrencyState] = useState('PHP');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_STORAGE_KEY)
      .then((stored) => {
        if (stored && SUPPORTED_CURRENCIES.some((c) => c.code === stored)) {
          setCurrencyState(stored);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const setCurrency = useCallback(async (code) => {
    setCurrencyState(code);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, code);
  }, []);

  return { currency, setCurrency, loading };
}
