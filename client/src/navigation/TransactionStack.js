import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import TransactionListScreen from '../screens/transactions/TransactionListScreen';
import TransactionDetailsScreen from '../screens/transactions/TransactionDetailsScreen';
import AddEditTransactionScreen from '../screens/transactions/AddEditTransactionScreen';
import CalendarViewScreen from '../screens/transactions/CalendarViewScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createStackNavigator();

export default function TransactionStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: colors.background },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{ title: 'Transactions' }}
      />
      <Stack.Screen
        name="TransactionDetails"
        component={TransactionDetailsScreen}
        options={{ title: 'Details' }}
      />
      <Stack.Screen
        name="AddEditTransaction"
        component={AddEditTransactionScreen}
        options={{ title: 'Transaction' }}
      />
      <Stack.Screen
        name="CalendarView"
        component={CalendarViewScreen}
        options={{ title: 'Calendar' }}
      />
    </Stack.Navigator>
  );
}
