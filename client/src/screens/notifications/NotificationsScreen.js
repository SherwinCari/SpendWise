/**
 * SpendWise Notifications Screen
 * Displays notifications sorted by created_at DESC with visual distinction
 * for unread (bold, teal left border) vs read (normal).
 * Notification types: budget_warning (gold), budget_caution (orange), budget_critical (red).
 * Tap to mark as read. Badge count shown on tab icon for unread.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

/** Map notification type to icon name and color */
const getNotificationTypeConfig = (type) => {
  switch (type) {
    case 'budget_warning':
      return { icon: 'alert-circle', color: '#F59E0B' }; // gold
    case 'budget_caution':
      return { icon: 'alert', color: '#F97316' }; // orange
    case 'budget_critical':
      return { icon: 'alert-octagon', color: '#EF4444' }; // red
    default:
      return { icon: 'bell', color: '#0D9488' }; // teal default
  }
};

/** Format a date string into a readable relative or absolute format */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

function NotificationItem({ notification, onPress, colors }) {
  const isUnread = !notification.is_read && !notification.isRead;
  const typeConfig = getNotificationTypeConfig(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: colors.card,
          borderLeftColor: isUnread ? colors.primary : 'transparent',
          borderLeftWidth: isUnread ? 4 : 4,
        },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread' : 'Read'} notification: ${notification.title}`}
      accessibilityHint="Tap to mark as read"
    >
      <View style={[styles.iconContainer, { backgroundColor: typeConfig.color + '15' }]}>
        <MaterialCommunityIcons
          name={typeConfig.icon}
          size={24}
          color={typeConfig.color}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              fontWeight: isUnread ? '700' : '400',
            },
          ]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text
          style={[
            styles.message,
            {
              color: colors.textSecondary,
              fontWeight: isUnread ? '600' : '400',
            },
          ]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
          {formatDate(notification.created_at || notification.createdAt)}
        </Text>
      </View>
      {isUnread && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { colors, spacing } = useTheme();
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback(
    async (notification) => {
      const isUnread = !notification.is_read && !notification.isRead;
      if (isUnread) {
        try {
          await markAsRead(notification.id);
        } catch {
          // Error is handled by context
        }
      }
    },
    [markAsRead]
  );

  const handleRefresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Sort notifications by created_at DESC
  const sortedNotifications = [...notifications].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return dateB - dateA;
  });

  if (loading && notifications.length === 0) {
    return <LoadingSpinner message="Loading notifications..." />;
  }

  if (!loading && notifications.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          title="No Notifications"
          message="You're all caught up! Budget alerts and updates will appear here."
          icon="🔔"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.expense + '15' }]}>
          <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
        </View>
      )}
      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
            colors={colors}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: 'rgba(13, 148, 136, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
