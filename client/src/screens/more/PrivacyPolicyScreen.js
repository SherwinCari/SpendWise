/**
 * Privacy Policy Screen
 * Displays the SpendWise privacy policy.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function PrivacyPolicyScreen() {
  const { colors, spacing } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.base }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Privacy Policy
      </Text>
      <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
        Last updated: June 2026
      </Text>

      <Section title="1. Information We Collect" colors={colors}>
        SpendWise collects the following information when you use our app:{'\n\n'}
        • <Text style={styles.bold}>Account Information:</Text> Name, email address, and encrypted password when you register.{'\n'}
        • <Text style={styles.bold}>Financial Data:</Text> Transaction records, wallet balances, budget limits, and categories you create.{'\n'}
        • <Text style={styles.bold}>Device Information:</Text> Device type and operating system for app performance optimization.
      </Section>

      <Section title="2. How We Use Your Information" colors={colors}>
        We use your information to:{'\n\n'}
        • Provide and maintain the SpendWise service{'\n'}
        • Track your income, expenses, and budgets{'\n'}
        • Generate financial reports and analytics{'\n'}
        • Send budget alerts and notifications{'\n'}
        • Authenticate your identity and secure your account
      </Section>

      <Section title="3. Data Storage & Security" colors={colors}>
        • Your data is stored securely in encrypted cloud databases.{'\n'}
        • Passwords are hashed using bcrypt with a minimum cost factor of 10.{'\n'}
        • All data transmission uses HTTPS encryption.{'\n'}
        • Authentication tokens are stored securely on your device using encrypted storage.
      </Section>

      <Section title="4. Data Sharing" colors={colors}>
        We do NOT sell, trade, or share your personal or financial data with third parties. Your financial information is private and only accessible to you.
      </Section>

      <Section title="5. Google Sign-In" colors={colors}>
        If you sign in with Google, we receive your name and email address from Google. We do not access your Google contacts, files, or any other Google data.
      </Section>

      <Section title="6. Data Retention" colors={colors}>
        Your data is retained as long as your account is active. If you delete your account, all associated data will be permanently removed from our servers within 30 days.
      </Section>

      <Section title="7. Your Rights" colors={colors}>
        You have the right to:{'\n\n'}
        • Access your personal data{'\n'}
        • Correct inaccurate data{'\n'}
        • Delete your account and data{'\n'}
        • Export your financial data
      </Section>

      <Section title="8. Contact Us" colors={colors}>
        If you have questions about this Privacy Policy, contact us at:{'\n\n'}
        Email: sherwincari@gmail.com
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({ title, children, colors }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 13,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
  },
});
