import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WalletListScreen from '../screens/wallets/WalletListScreen';
import WalletTransferScreen from '../screens/wallets/WalletTransferScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createStackNavigator();

export default function WalletStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="WalletList"
        component={WalletListScreen}
        options={{ title: 'Wallets' }}
      />
      <Stack.Screen
        name="WalletTransfer"
        component={WalletTransferScreen}
        options={{ title: 'Transfer' }}
      />
    </Stack.Navigator>
  );
}
