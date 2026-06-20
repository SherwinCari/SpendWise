import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BudgetListScreen from '../screens/budgets/BudgetListScreen';
import AddEditBudgetScreen from '../screens/budgets/AddEditBudgetScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createStackNavigator();

export default function BudgetStack() {
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
        name="BudgetList"
        component={BudgetListScreen}
        options={{ title: 'Budgets' }}
      />
      <Stack.Screen
        name="AddEditBudget"
        component={AddEditBudgetScreen}
        options={{ title: 'Budget' }}
      />
    </Stack.Navigator>
  );
}
