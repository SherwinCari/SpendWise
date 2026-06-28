/**
 * Push Notifications utility
 * Uses expo-notifications for local push notifications.
 * Triggers notifications for:
 * - Budget thresholds (50%, 75%, 100%)
 * - Savings goal reached
 * - Transaction recorded (random encouraging messages)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions (call on app start or first login)
 */
export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    // Notifications don't work on emulator
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Quorax',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
    });
  }

  return true;
}

/**
 * Send a local notification for budget threshold alerts
 */
export async function notifyBudgetThreshold(categoryName, percentage) {
  let title, body;

  if (percentage >= 100) {
    title = '🚨 Budget Exceeded!';
    body = `Your ${categoryName} budget is fully consumed. Time to slow down!`;
  } else if (percentage >= 75) {
    title = '⚠️ Budget Alert';
    body = `You've used ${Math.round(percentage)}% of your ${categoryName} budget. Be careful!`;
  } else if (percentage >= 50) {
    title = '💡 Budget Reminder';
    body = `You've used ${Math.round(percentage)}% of your ${categoryName} budget. Stay on track!`;
  } else {
    return; // No notification for <50%
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // Immediate
  });
}

/**
 * Send a notification when a savings goal is reached
 */
export async function notifySavingsGoalReached(goalName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Goal Reached!',
      body: `Congratulations! You've reached your "${goalName}" savings goal!`,
      sound: true,
    },
    trigger: null,
  });
}

/**
 * Send an encouraging notification after recording a transaction
 */
const TRANSACTION_MESSAGES = [
  { title: '✅ Transaction Recorded', body: 'Great job keeping track of your finances!' },
  { title: '📝 Expense Logged', body: 'Every entry brings you closer to financial clarity.' },
  { title: '💪 Tracked!', body: 'Consistent tracking is the key to financial success.' },
  { title: '🎯 Nice!', body: 'You\'re building good financial habits.' },
  { title: '📊 Logged!', body: 'Your future self will thank you for tracking this.' },
];

export async function notifyTransactionRecorded(type) {
  // Only send notification ~30% of the time to avoid being annoying
  if (Math.random() > 0.3) return;

  const messages = type === 'income'
    ? [
        { title: '💰 Income Added!', body: 'Nice! Keep that money flowing in.' },
        { title: '🎉 Money In!', body: 'Great news — income recorded successfully.' },
      ]
    : TRANSACTION_MESSAGES;

  const msg = messages[Math.floor(Math.random() * messages.length)];

  await Notifications.scheduleNotificationAsync({
    content: { title: msg.title, body: msg.body, sound: false },
    trigger: null,
  });
}

/**
 * Send a bill reminder notification
 */
export async function notifyBillReminder(title, amount, daysUntilDue) {
  const body = daysUntilDue === 0
    ? `${title} (₱${amount}) is due today!`
    : `${title} (₱${amount}) is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: daysUntilDue === 0 ? '🔴 Bill Due Today!' : '📅 Upcoming Bill',
      body,
      sound: true,
    },
    trigger: null,
  });
}
