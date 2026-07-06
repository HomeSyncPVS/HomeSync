import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { StatusChip, StatusTone } from '../../components/StatusChip';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COMPLAINTS: { id: string; icon: keyof typeof MaterialIcons.glyphMap; title: string; status: string; tone: StatusTone; date: string; ref: string }[] = [
  { id: '1', icon: 'plumbing', title: 'Kitchen Sink Leak', status: 'Resolved', tone: 'success', date: 'Jun 24', ref: 'CMP-4921' },
  { id: '2', icon: 'bolt', title: 'Main Circuit Trip', status: 'In Progress', tone: 'warning', date: 'Jun 26', ref: 'CMP-5012' },
  { id: '3', icon: 'ac-unit', title: 'AC Servicing Required', status: 'Assigned', tone: 'info', date: 'Yesterday', ref: 'CMP-5088' },
  { id: '4', icon: 'door-front', title: 'Main Door Hinge Repair', status: 'Raised', tone: 'neutral', date: 'Today', ref: 'CMP-5103' },
  { id: '5', icon: 'cleaning-services', title: 'Post-Renovation Cleaning', status: 'Resolved', tone: 'success', date: 'Jun 12', ref: 'CMP-4201' },
];

export function ComplaintsListScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const resolvedCount = COMPLAINTS.filter((c) => c.status === 'Resolved').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Complaints" rightIcon="filter-list" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}>
        <View style={styles.statsRow}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>
              Total Tickets
            </Text>
            <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '800', marginTop: 4 }}>
              {COMPLAINTS.length}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>
              Resolved
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 26, fontWeight: '800', marginTop: 4 }}>
              {resolvedCount}
            </Text>
          </Card>
        </View>

        <View style={{ gap: 12 }}>
          {COMPLAINTS.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => navigation.navigate('ComplaintDetail', { complaintId: c.id })}>
              <Card style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
                  <MaterialIcons name={c.icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{c.title}</Text>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>{c.date}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <StatusChip label={c.status} tone={c.tone} />
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>• #{c.ref}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('RaiseComplaint')}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6FED',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
