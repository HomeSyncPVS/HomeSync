import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

const NOTICES = [
  {
    id: '1',
    type: 'Emergency' as const,
    title: 'Emergency Water Maintenance',
    body: 'Immediate shutdown of water supply in Tower B for critical leak repairs. Expected duration: 4 hours.',
    time: 'Today, 10:45 AM',
  },
  {
    id: '2',
    type: 'Poll' as const,
    title: 'New Security Protocol Voting',
    body: 'Cast your vote on the proposed digital guest entry system.',
    time: '2h ago',
    options: ['Approve New System', 'Keep Current Process'],
  },
  {
    id: '3',
    type: 'Event' as const,
    title: 'Annual Residents Mixer',
    body: 'Join your neighbors for an evening of networking and refreshments at the Clubhouse Rooftop Garden next Saturday.',
    time: 'Oct 24, 6:00 PM · Clubhouse',
  },
  {
    id: '4',
    type: 'General' as const,
    title: 'Waste Collection Schedule Update',
    body: 'Please note the revised schedule for dry waste collection starting next Monday.',
    time: 'Yesterday',
    attachment: 'Schedule_Jul_2026.pdf',
  },
];

const TYPE_COLOR: Record<string, 'error' | 'info' | 'success' | 'neutral'> = {
  Emergency: 'error',
  Poll: 'info',
  Event: 'success',
  General: 'neutral',
};

export function NoticesScreen() {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Notices" showBack={false} rightIcon="tune" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.onSurface }]}>Notices</Text>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Stay updated with your community.</Text>
          </View>
          <View style={[styles.newBadge, { backgroundColor: colors.primary + '14' }]}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{NOTICES.length} New</Text>
          </View>
        </View>

        {NOTICES.map((n) => (
          <Card
            key={n.id}
            style={n.type === 'Emergency' ? { borderColor: colors.error, borderWidth: 2 } : undefined}
          >
            {n.type === 'Emergency' && (
              <View style={[styles.emergencyBanner, { backgroundColor: colors.error }]}>
                <MaterialIcons name="error" size={16} color="#FFFFFF" />
                <Text style={styles.emergencyBannerText}>Urgent Notice</Text>
              </View>
            )}
            {n.type !== 'Emergency' && (
              <View style={styles.tagRow}>
                <View style={[styles.typeTag, { backgroundColor: colors.onSurfaceVariant + '14' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.onSurfaceVariant }}>{n.type}</Text>
                </View>
                <Text style={{ color: colors.outline, fontSize: 11 }}>{n.time}</Text>
              </View>
            )}
            <Text style={[styles.noticeTitle, { color: colors.onSurface, marginTop: n.type === 'Emergency' ? 12 : 8 }]}>
              {n.title}
            </Text>
            <Text style={{ color: colors.onSurfaceVariant, marginTop: 6, lineHeight: 20 }}>{n.body}</Text>

            {n.options && (
              <View style={{ gap: 8, marginTop: 12 }}>
                {n.options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pollOption, { borderColor: colors.outlineVariant }]}
                  >
                    <Text style={{ color: colors.onSurface, fontSize: 13, fontWeight: '600' }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {n.attachment && (
              <TouchableOpacity style={[styles.attachmentRow, { borderTopColor: colors.outlineVariant }]}>
                <MaterialIcons name="attach-file" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{n.attachment}</Text>
              </TouchableOpacity>
            )}

            {n.type === 'Emergency' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <MaterialIcons name="calendar-today" size={14} color={colors.outline} />
                <Text style={{ color: colors.outline, fontSize: 12 }}>{n.time}</Text>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  newBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  emergencyBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  emergencyBannerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noticeTitle: { fontSize: 16, fontWeight: '700' },
  pollOption: { paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderRadius: 10 },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
});
