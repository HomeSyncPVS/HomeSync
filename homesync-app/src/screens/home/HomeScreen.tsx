import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={[styles.logoDot, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="upload" size={18} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandText, { color: colors.primary }]}>HomeSync</Text>
        </View>
        <TouchableOpacity style={styles.bellButton}>
          <MaterialIcons name="notifications" size={24} color={colors.onSurfaceVariant} />
          <View style={[styles.badgeDot, { backgroundColor: colors.error, borderColor: colors.background }]} />
        </TouchableOpacity>
      </View>

      {/* Maintenance hero card */}
      <Card>
        <View style={styles.heroTop}>
          <View>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Maintenance Due</Text>
            <Text style={[styles.amount, { color: colors.primary }]}>₹4,500</Text>
          </View>
          <View style={[styles.duePill, { backgroundColor: colors.primary + '14' }]}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Due: Aug 15</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('ResidentTabs')}
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.receiptButton, { borderColor: colors.outlineVariant }]}
            onPress={() => navigation.navigate('PaymentHistory')}
          >
            <MaterialIcons name="receipt-long" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Quick actions */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('ComplaintsList')}>
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="report-problem" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.onSurfaceVariant }]}>Complaints</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="campaign" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.onSurfaceVariant }]}>Notices</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="event" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.onSurfaceVariant }]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickIconBox, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="contacts" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.onSurfaceVariant }]}>Directory</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Latest notice */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Latest Notice</Text>
          <TouchableOpacity>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>See all</Text>
          </TouchableOpacity>
        </View>
        <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.error }}>
          <View style={styles.urgentRow}>
            <View style={[styles.urgentDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.urgentLabel, { color: colors.error }]}>Urgent</Text>
          </View>
          <Text style={[styles.noticeTitle, { color: colors.onSurface }]}>Water Supply Interruption</Text>
          <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}>
            Essential maintenance on the overhead tank scheduled for tomorrow from 10 AM to 2 PM.
          </Text>
          <View style={styles.noticeMetaRow}>
            <MaterialIcons name="calendar-today" size={14} color={colors.outline} />
            <Text style={{ color: colors.outline, fontSize: 12 }}>Today, 02:45 PM</Text>
          </View>
        </Card>
      </View>

      {/* Upcoming event */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Community Events</Text>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={[styles.eventImagePlaceholder, { backgroundColor: colors.surfaceContainerHigh }]}>
            <View style={[styles.eventBadge, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>COMMUNITY</Text>
            </View>
          </View>
          <View style={{ padding: spacing.md }}>
            <Text style={[styles.eventTitle, { color: colors.onSurface }]}>Independence Day Celebration</Text>
            <View style={styles.eventMetaRow}>
              <View style={styles.eventMetaItem}>
                <MaterialIcons name="schedule" size={16} color={colors.primary} />
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Aug 15, 08:30 AM</Text>
              </View>
              <View style={styles.eventMetaItem}>
                <MaterialIcons name="location-on" size={16} color={colors.primary} />
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Central Park</Text>
              </View>
            </View>
            <View style={styles.eventBottomRow}>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>+24 attending</Text>
              <TouchableOpacity
                style={[styles.rsvpButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('EventDetail', { eventId: 'independence-day' })}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>RSVP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 20, fontWeight: '700' },
  bellButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  amount: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  duePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  payButton: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  receiptButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickActionsRow: { flexDirection: 'row', gap: 16 },
  quickAction: { alignItems: 'center', gap: 8, width: 72 },
  quickIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quickLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  urgentDot: { width: 8, height: 8, borderRadius: 4 },
  urgentLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  noticeTitle: { fontSize: 16, fontWeight: '700' },
  noticeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  eventImagePlaceholder: { height: 160, justifyContent: 'flex-end', padding: 12 },
  eventBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eventTitle: { fontSize: 18, fontWeight: '700' },
  eventMetaRow: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 12 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rsvpButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
});
