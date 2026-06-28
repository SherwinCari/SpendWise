/**
 * Quorax Settings Screen
 * - Dark mode toggle
 * - User profile section
 * - Logout / Delete account
 * - Privacy policy
 * - App version info
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency, SUPPORTED_CURRENCIES } from '../../utils/currency';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, spacing } = useTheme();
  const { user, logout, deleteAccount, loading } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const navigation = useNavigation();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? Your data will be permanently removed after 30 days. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert(
                'Account Deleted',
                'Your account has been scheduled for deletion. It will be permanently removed in 30 days.'
              );
            } catch {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: spacing.base, paddingVertical: spacing.lg },
      ]}
    >
      {/* User Profile Section */}
      <Card style={styles.section}>
        <View style={styles.profileRow}>
          <Avatar name={user?.name} size={56} />
          <View style={[styles.profileInfo, { marginLeft: spacing.base }]}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.name || 'Quorax User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email || 'No email'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Appearance Section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Appearance
      </Text>
      <Card style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
              Switch between light and dark theme
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#D1D5DB', true: colors.primary + '80' }}
            thumbColor={isDark ? colors.primary : '#F9FAFB'}
            accessibilityLabel="Toggle dark mode"
          />
        </View>
      </Card>

      {/* Account Section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Account
      </Text>
      <Card style={styles.section}>
        <TouchableOpacity
          style={[styles.settingRow, { marginBottom: spacing.sm }]}
          onPress={() => navigation.navigate('ChangePassword')}
          accessibilityRole="button"
        >
          <View style={styles.settingLabel}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Change Password</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
              Update your account password via email verification
            </Text>
          </View>
          <Text style={[{ color: colors.primary, fontSize: 18 }]}>›</Text>
        </TouchableOpacity>
        <Button title="Log Out" variant="danger" onPress={handleLogout} loading={loading} />
      </Card>

      {/* Preferences Section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Preferences
      </Text>
      <Card style={styles.section}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowCurrencyPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select currency"
        >
          <View style={styles.settingLabel}>
            <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Currency</Text>
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
              Choose your preferred display currency
            </Text>
          </View>
          <Text style={[{ color: colors.primary, fontSize: 16, fontWeight: '500' }]}>
            {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '₱'} {currency}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Danger Zone */}
      <Text style={[styles.sectionTitle, { color: colors.expense, marginTop: spacing.lg }]}>
        Danger Zone
      </Text>
      <Card style={styles.section}>
        <Text style={[{ color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm }]}>
          Permanently delete your account and all data. This will take effect after 30 days.
        </Text>
        <Button title="Delete Account" variant="danger" onPress={handleDeleteAccount} loading={loading} />
      </Card>

      {/* About Section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        About
      </Text>
      <Card style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Version</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{appVersion}</Text>
        </View>
        <View style={[styles.infoRow, { marginTop: spacing.sm }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Name</Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Quorax</Text>
        </View>
        <TouchableOpacity
          style={[styles.infoRow, { marginTop: spacing.md }]}
          onPress={() => navigation.navigate('PrivacyPolicy')}
          accessibilityRole="link"
        >
          <Text style={[styles.infoLabel, { color: colors.primary }]}>Privacy Policy</Text>
          <Text style={[{ color: colors.primary, fontSize: 16 }]}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Currency</Text>
            <FlatList
              data={SUPPORTED_CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.currencyItem, currency === item.code && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { setCurrency(item.code); setShowCurrencyPicker(false); }}
                >
                  <Text style={[styles.currencySymbol, { color: colors.textPrimary }]}>{item.symbol}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[{ color: colors.textPrimary, fontSize: 15, fontWeight: '500' }]}>{item.code}</Text>
                    <Text style={[{ color: colors.textSecondary, fontSize: 13 }]}>{item.name}</Text>
                  </View>
                  {currency === item.code && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginLeft: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileEmail: { fontSize: 14, marginTop: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { flex: 1, marginRight: 12 },
  settingTitle: { fontSize: 16, fontWeight: '500' },
  settingSubtitle: { fontSize: 13, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { maxHeight: '50%', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24, paddingTop: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  currencyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 8 },
  currencySymbol: { fontSize: 20, fontWeight: '600', width: 30, textAlign: 'center' },
});
