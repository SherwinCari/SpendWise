/**
 * MoreMenuScreen
 * Main menu for the "More" tab. Shows profile header, navigation items
 * (Categories, Analytics, Notifications, Settings), and a logout button.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';

const MENU_ITEMS = [
  {
    key: 'Categories',
    icon: 'shape',
    label: 'Categories',
    description: 'Manage income & expense categories',
  },
  {
    key: 'Analytics',
    icon: 'chart-bar',
    label: 'Analytics',
    description: 'View reports and spending trends',
  },
  {
    key: 'RecurringTransactions',
    icon: 'refresh',
    label: 'Recurring',
    description: 'Manage recurring transactions',
  },
  {
    key: 'BillReminders',
    icon: 'bell-ring-outline',
    label: 'Bill Reminders',
    description: 'Track upcoming bills and due dates',
  },
  {
    key: 'SavingsGoals',
    icon: 'piggy-bank-outline',
    label: 'Savings Goals',
    description: 'Set and track savings targets',
  },
  {
    key: 'Notifications',
    icon: 'bell-outline',
    label: 'Notifications',
    description: 'Budget alerts and updates',
  },
  {
    key: 'Settings',
    icon: 'cog-outline',
    label: 'Settings',
    description: 'Dark mode, security, and app info',
  },
];

export default function MoreMenuScreen({ navigation }) {
  const { colors, spacing, borderRadius, shadows } = useTheme();
  const { user, logout, loading } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.base }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar name={user?.name} size={56} />
          <View style={[styles.profileInfo, { marginLeft: spacing.base }]}>
            <Text
              style={[styles.profileName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {user?.name || 'SpendWise User'}
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {user?.email || 'No email'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go to settings"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Menu Items */}
      <View style={{ marginTop: spacing.lg }}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.menuItem,
              {
                backgroundColor: colors.card,
                borderRadius: borderRadius.card,
                padding: spacing.base,
                marginBottom: spacing.sm,
                ...shadows.card,
              },
            ]}
            onPress={() => navigation.navigate(item.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: colors.primary + '12' },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {item.label}
              </Text>
              <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            </View>
            <View style={styles.menuRight}>
              {item.key === 'Notifications' && unreadCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[
          styles.logoutButton,
          {
            backgroundColor: colors.card,
            borderRadius: borderRadius.card,
            padding: spacing.base,
            marginTop: spacing.lg,
            borderWidth: 1,
            borderColor: colors.expense + '30',
            ...shadows.card,
          },
        ]}
        onPress={handleLogout}
        disabled={loading}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <MaterialCommunityIcons
          name="logout"
          size={22}
          color={colors.expense}
        />
        <Text style={[styles.logoutText, { color: colors.expense, marginLeft: spacing.md }]}>
          {loading ? 'Logging out...' : 'Log Out'}
        </Text>
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  profileCard: {},
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
