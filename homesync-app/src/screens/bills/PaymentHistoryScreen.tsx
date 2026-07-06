import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { StatusChip } from '../../components/StatusChip';
import { useTheme } from '../../theme/ThemeContext';

type Filter = 'All' | 'Paid' | 'Unpaid';

const TRANSACTIONS = [
  { month: 'June 2026', amount: 4500, status: 'Paid' as const, ref: 'HS-9281', date: 'Jun 05, 2026' },
  { month: 'May 2026', amount: 4200, status: 'Paid' as const, ref: 'HS-8104', date: 'May 02, 2026' },
  { month: 'April 2026', amount: 4200, status: 'Unpaid' as const, ref: null, date: 'Overdue 60+ days' },
];

export function PaymentHistoryScreen() {
  const { colors, spacing } = useTheme();
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = TRANSACTIONS.filter((t) => filter === 'All' || t.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Payment History" rightIcon="search" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md }}>
        <View style={styles.filterRow}>
          {(['All', 'Paid', 'Unpaid'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                { backgroundColor: filter === f ? colors.primary : colors.surface, borderColor: colors.outlineVariant },
              ]}
            >
              <Text style={{ color: filter === f ? '#FFFFFF' : colors.onSurfaceVariant, fontWeight: '700', fontSize: 13 }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ gap: 12 }}>
          {filtered.map((t) => (
            <Card key={t.month} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{t.month}</Text>
                <View style={styles.metaRow}>
                  <StatusChip label={t.status} tone={t.status === 'Paid' ? 'success' : 'error'} />
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                    {t.ref ? `• Ref: ${t.ref}` : `• ${t.date}`}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 16 }}>
                  ₹{t.amount.toLocaleString('en-IN')}
                </Text>
                <Text style={{ color: t.status === 'Unpaid' ? colors.error : colors.onSurfaceVariant, fontSize: 11, fontWeight: t.status === 'Unpaid' ? '700' : '400' }}>
                  {t.status === 'Unpaid' ? 'Action Required' : t.date}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {filtered.length === 0 && (
          <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
            No transactions in this filter.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
});
