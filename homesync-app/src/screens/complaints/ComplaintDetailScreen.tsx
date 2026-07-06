import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { StatusChip } from '../../components/StatusChip';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'ComplaintDetail'>;

const TIMELINE = [
  { label: 'Complaint Raised', date: 'Jul 04, 2026 · 09:15 AM', detail: 'Reported by Apartment 402B.', done: true },
  { label: 'Vendor Assigned', date: 'Jul 04, 2026 · 10:30 AM', detail: 'Assigned to QuickFix Plumbing Services.', done: true },
  { label: 'Work In Progress', date: 'Started: Jul 04, 2026 · 02:00 PM', detail: 'Vendor has arrived and is inspecting the leakage.', done: true, active: true },
  { label: 'Resolved', date: 'Pending completion', detail: '', done: false },
];

export function ComplaintDetailScreen() {
  const route = useRoute<Rt>();
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={`Complaint #${route.params.complaintId.padStart(4, '4')}`} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md }}>
        <Card>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Kitchen Sink Pipe Leakage</Text>
            <StatusChip label="In Progress" tone="warning" />
          </View>
          <Text style={{ color: colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 }}>
            Water is leaking from the main drain pipe under the kitchen sink. Requires urgent attention to avoid
            cabinet damage.
          </Text>
          <View style={styles.photoRow}>
            <View style={[styles.photoThumb, { backgroundColor: colors.surfaceContainerHigh }]} />
            <View style={[styles.photoThumb, { backgroundColor: colors.surfaceContainerHigh }]} />
            <View style={[styles.addPhotoThumb, { borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="add-a-photo" size={20} color={colors.outline} />
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Status History</Text>
          {TIMELINE.map((step, i) => (
            <View key={step.label} style={styles.timelineRow}>
              <View style={styles.timelineIconCol}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: step.done ? colors.secondary : colors.surfaceContainerHigh,
                    },
                    step.active && { backgroundColor: colors.primary },
                  ]}
                >
                  {step.done && !step.active && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                  {step.active && <View style={styles.pulseDot} />}
                  {!step.done && <MaterialIcons name="hourglass-empty" size={14} color={colors.onSurfaceVariant} />}
                </View>
                {i < TIMELINE.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: step.done ? colors.secondary : colors.outlineVariant }]} />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: 20 }}>
                <Text style={{ color: step.active ? colors.primary : colors.onSurface, fontWeight: '700' }}>
                  {step.label}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>{step.date}</Text>
                {step.detail ? (
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginTop: 4 }}>{step.detail}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </Card>

        <Card style={{ backgroundColor: colors.primary + '0D', borderColor: colors.primary + '20' }}>
          <Text style={[styles.vendorLabel, { color: colors.primary }]}>Assigned Professional</Text>
          <View style={styles.vendorRow}>
            <View style={[styles.vendorAvatar, { backgroundColor: colors.surfaceContainerHigh }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onSurface, fontWeight: '700' }}>Robert Harrison</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="star" size={14} color={colors.tertiary} />
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>4.8 · QuickFix Plumbing</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.vendorAction, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
              <MaterialIcons name="chat-bubble" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.vendorAction, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="call" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  photoRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  photoThumb: { width: 72, height: 72, borderRadius: 12 },
  addPhotoThumb: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineIconCol: { alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  vendorLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24 },
  vendorAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
