import React from 'react';
import { AuthProvider } from './AuthContext';
import { WalletProvider } from './WalletContext';
import { TransactionProvider } from './TransactionContext';
import { BudgetProvider } from './BudgetContext';
import { CategoryProvider } from './CategoryContext';
import { NotificationProvider } from './NotificationContext';

/**
 * AppProvider composes all context providers.
 * Auth wraps everything since other providers may depend on authentication state.
 * The remaining providers are nested inside Auth in a logical dependency order.
 */
export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <CategoryProvider>
        <WalletProvider>
          <BudgetProvider>
            <TransactionProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </TransactionProvider>
          </BudgetProvider>
        </WalletProvider>
      </CategoryProvider>
    </AuthProvider>
  );
}

export default AppProvider;
