import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

const QUICK_ACTIONS: { label: string; icon: keyof typeof MaterialIcons.glyphMap; tint: 'primary' | 'secondary' | 'tertiary' | 'neutral' }[] = [
  { label: 'Generate Bills', icon: 'receipt-long', tint: 'primary' },
  { label: 'Post Notice', icon: 'campaign', tint: 'secondary' },
  { label: 'Add Vendor', icon: 'person-add', tint: 'tertiary' },
  { label: 'View Reports', icon: 'bar-chart', tint: 'neutral' },
];

const APPROVALS = [
  { name: 'Aman Gupta', unit: 'B-402 · Resident' },
  { name: 'Sana Khan', unit: 'C-105 · Tenant' },
];

const COMPLAINTS = [
  { title: 'Elevator B-2 Stuck', reporter: 'B-801 · 15m ago', priority: 'Critical' as const },
  { title: 'Leakage in Gym', reporter: 'Staff · 1h ago', priority: 'In Progress' as const },
];

export function AdminDashboardScreen() {
  const { colors, spacing } = useTheme();

  const tintColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    tertiary: colors.tertiary,
    neutral: colors.onSurfaceVariant,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="SocietyHub Heights" rightIcon="notifications" rightBadge />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 40 }}>
        <View style={styles.statsRow}>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Residents</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>420</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Collection</Text>
            <Text style={[styles.statValue, { color: colors.secondary }]}>88%</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={styles.statLabel}>Open Tasks</Text>
            <Text style={[styles.statValue, { color: colors.error }]}>12</Text>
          </Card>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={{ width: '48%' }}>
              <Card style={styles.quickAction}>
                <View style={[styles.quickIconBox, { backgroundColor: tintColor[a.tint] + '1A' }]}>
                  <MaterialIcons name={a.icon} size={22} color={tintColor[a.tint]} />
                </View>
                <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 13 }}>{a.label}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
              PENDING APPROVALS ({APPROVALS.length})
            </Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>View all</Text>
          </View>
          <View style={{ gap: 10 }}>
            {APPROVALS.map((a) => (
              <Card key={a.name} style={styles.approvalRow}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceContainerLow }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {a.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{a.name}</Text>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{a.unit}</Text>
                </View>
                <TouchableOpacity style={[styles.approveButton, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rejectButton, { borderColor: colors.outlineVariant }]}>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, fontWeight: '700' }}>Reject</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant, marginBottom: 10 }]}>
            RECENT COMPLAINTS
          </Text>
          <Card style={{ gap: 0 }}>
            {COMPLAINTS.map((c, i) => (
              <View
                key={c.title}
                style={[styles.complaintRow, i < COMPLAINTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }]}
              >
                <View style={[styles.complaintIcon, { backgroundColor: colors.error + '14' }]}>
                  <MaterialIcons name="elevator" size={18} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.complaintTop}>
                    <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 13 }}>{c.title}</Text>
                    <Text
                      style={{
                        color: c.priority === 'Critical' ? colors.error : colors.onSurfaceVariant,
                        fontSize: 10,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      }}
                    >
                      {c.priority}
                    </Text>
                  </View>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>{c.reporter}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#8A8F98', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  quickAction: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  approvalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  approveButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  rejectButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  complaintRow: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  complaintIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  complaintTop: { flexDirection: 'row', justifyContent: 'space-between' },
});
