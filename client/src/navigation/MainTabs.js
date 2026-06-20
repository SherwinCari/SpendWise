import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from '../screens/home/DashboardScreen';
import TransactionStack from './TransactionStack';
import WalletStack from './WalletStack';
import BudgetStack from './BudgetStack';
import MoreStack from './MoreStack';
import { useTheme } from '../theme/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { colors, isDark } = useTheme();
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderTopColor: isDark ? colors.card : '#E2E8F0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="swap-horizontal" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallets"
        component={WalletStack}
        options={{
          tabBarLabel: 'Wallets',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetStack}
        options={{
          tabBarLabel: 'Budgets',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-pie" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dots-horizontal" color={color} size={size} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: unreadCount > 0 ? { backgroundColor: colors.primary } : undefined,
        }}
      />
    </Tab.Navigator>
  );
}
