import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MoreMenuScreen from '../screens/more/MoreMenuScreen';
import AnalyticsScreen from '../screens/more/AnalyticsScreen';
import NotificationsScreen from '../screens/more/NotificationsScreen';
import CategoriesScreen from '../screens/more/CategoriesScreen';
import SettingsScreen from '../screens/more/SettingsScreen';
import PrivacyPolicyScreen from '../screens/more/PrivacyPolicyScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createStackNavigator();

export default function MoreStack() {
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
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ title: 'More' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: 'Categories' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
    </Stack.Navigator>
  );
}
