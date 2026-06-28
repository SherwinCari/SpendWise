/**
 * CalendarViewScreen
 * Shows a monthly calendar with dots on days that have transactions.
 * Tapping a day shows that day's transactions below.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useTransactions } from '../../context/TransactionContext';
import TransactionCard from '../../components/transactions/TransactionCard';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarViewScreen({ navigation }) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const { transactions } = useTransactions();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  // Group transactions by date (YYYY-MM-DD)
  const transactionsByDate = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const dateKey = t.date ? t.date.split('T')[0] : null;
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(t);
      }
    });
    return map;
  }, [transactions]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [currentMonth, currentYear]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const getDateKey = (day) => {
    const month = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${month}-${d}`;
  };

  const selectedTransactions = selectedDate ? (transactionsByDate[selectedDate] || []) : [];
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Navigation */}
      <View style={[styles.monthHeader, { paddingHorizontal: spacing.base, paddingTop: spacing.base }]}>
        <TouchableOpacity onPress={goToPrevMonth} accessibilityLabel="Previous month">
          <Icon name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary, fontWeight: fontWeight.semiBold }]}>
          {monthName} {currentYear}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} accessibilityLabel="Next month">
          <Icon name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={[styles.weekRow, { paddingHorizontal: spacing.sm }]}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={[styles.calendarGrid, { paddingHorizontal: spacing.sm }]}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateKey = getDateKey(day);
          const hasTransactions = !!transactionsByDate[dateKey];
          const isSelected = selectedDate === dateKey;
          const isToday =
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: colors.primary + '20', borderRadius: 8 },
                isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary, borderRadius: 8 },
              ]}
              onPress={() => setSelectedDate(dateKey)}
              accessibilityLabel={`${monthName} ${day}`}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: isSelected ? colors.primary : colors.textPrimary, fontWeight: isToday ? fontWeight.bold : fontWeight.regular },
                ]}
              >
                {day}
              </Text>
              {hasTransactions && (
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Transactions */}
      {selectedDate && (
        <View style={[styles.dayTransactions, { marginTop: spacing.lg }]}>
          <Text style={[styles.dayLabel, { color: colors.textPrimary, paddingHorizontal: spacing.base, fontWeight: fontWeight.semiBold }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          {selectedTransactions.length > 0 ? (
            selectedTransactions.map((t) => (
              <TransactionCard
                key={t.id}
                transaction={t}
                onPress={() =>
                  navigation.navigate('TransactionDetails', { transactionId: t.id })
                }
              />
            ))
          ) : (
            <Text style={[styles.noTransactions, { color: colors.textSecondary, paddingHorizontal: spacing.base }]}>
              No transactions on this day
            </Text>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: { fontSize: 18 },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: { fontWeight: '500' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  dayTransactions: {},
  dayLabel: { fontSize: 16, marginBottom: 8 },
  noTransactions: { fontSize: 14, marginTop: 8 },
});
