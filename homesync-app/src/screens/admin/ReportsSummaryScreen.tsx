import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export function ReportsSummaryScreen() {
  const { colors, spacing, radius } = useTheme();

  // Mock data calculated client-side (combining listings/counting locally)
  const reportData = {
    complaints: {
      resolved: 14,
      total: 18,
      avgResolutionDays: 2.4,
      monthlyBreakdown: [5, 8, 12, 10, 14], // Jan-May values
    },
    notices: {
      totalThisMonth: 12,
      byType: { emergency: 2, general: 6, maintenance: 4 },
    },
    events: {
      totalThisMonth: 4,
      totalAttendees: 154,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Reports Summary" showBack={true} />

      <ScrollView contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.md }}>
        
        {/* Core calculation warning to dev team */}
        <View style={{ paddingHorizontal: 20 }}>
          <Card style={{ backgroundColor: colors.primary + '0A', borderColor: colors.primary + '33', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <MaterialIcons name="warning" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Calculation Warning</Text>
            </View>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
              No dedicated analytics exists for notices/complaints/events in the backend. These metrics are computed client-side from standard query listings or represent Pranay's billing analytics updates.
            </Text>
          </Card>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.onSurface, paddingHorizontal: 20 }]}>
          Monthly Insights
        </Text>

        {/* Horizontal Swipeable Chart Cards strictly as per requirement */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          contentContainerStyle={[styles.swipeContainer, { paddingHorizontal: 20 }]}
        >
          {/* Card 1: Complaints Resolved */}
          <Card style={StyleSheet.flatten([styles.swipeCard, { width: CARD_WIDTH, borderRadius: radius.lg }])}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.error + '1A' }]}>
                <MaterialIcons name="report-problem" size={20} color={colors.error} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Complaints Resolution</Text>
            </View>

            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.hugeNum, { color: colors.secondary }]}>
                  {reportData.complaints.resolved}/{reportData.complaints.total}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Resolved Tickets</Text>
              </View>
              <View style={styles.rightStat}>
                <Text style={[styles.avgText, { color: colors.primary }]}>
                  {reportData.complaints.avgResolutionDays} Days
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Avg Resolution Time</Text>
              </View>
            </View>

            <Text style={[styles.chartTitle, { color: colors.outline }]}>COMPLAINTS HISTORY (LAST 5 MONTHS)</Text>
            <View style={styles.barChartContainer}>
              {reportData.complaints.monthlyBreakdown.map((val, idx) => (
                <View key={idx} style={styles.chartBarColumn}>
                  <View style={[styles.chartBar, { height: val * 5, backgroundColor: colors.primary, borderRadius: radius.sm }]} />
                  <Text style={{ color: colors.outline, fontSize: 10, marginTop: 4 }}>M{idx + 1}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Card 2: Notice Type Analytics */}
          <Card style={StyleSheet.flatten([styles.swipeCard, { width: CARD_WIDTH, borderRadius: radius.lg }])}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '1A' }]}>
                <MaterialIcons name="campaign" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Notice Feed Analytics</Text>
            </View>

            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.hugeNum, { color: colors.onSurface }]}>
                  {reportData.notices.totalThisMonth}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Notices Posted This Month</Text>
              </View>
            </View>

            <View style={[styles.detailsList, { marginTop: 14 }]}>
              <View style={styles.detailsItem}>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Emergency Announcements</Text>
                <Text style={{ color: colors.error, fontWeight: '700' }}>{reportData.notices.byType.emergency}</Text>
              </View>
              <View style={styles.detailsItem}>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>General Updates</Text>
                <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{reportData.notices.byType.general}</Text>
              </View>
              <View style={styles.detailsItem}>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Maintenance Notices</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{reportData.notices.byType.maintenance}</Text>
              </View>
            </View>
          </Card>

          {/* Card 3: Events Attendance */}
          <Card style={StyleSheet.flatten([styles.swipeCard, { width: CARD_WIDTH, borderRadius: radius.lg }])}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.secondary + '1A' }]}>
                <MaterialIcons name="event" size={20} color={colors.secondary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Event Engagement</Text>
            </View>

            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.hugeNum, { color: colors.primary }]}>
                  {reportData.events.totalThisMonth}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Events Organised</Text>
              </View>
              <View style={styles.rightStat}>
                <Text style={[styles.avgText, { color: colors.secondary }]}>
                  {reportData.events.totalAttendees}
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Total RSVPs Received</Text>
              </View>
            </View>

            <View style={[styles.notificationBox, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, marginTop: 16 }]}>
              <MaterialIcons name="insights" size={20} color={colors.primary} />
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, flex: 1 }}>
                RSVP engagement rate increased by 18% compared to the previous quarter.
              </Text>
            </View>
          </Card>
        </ScrollView>

        {/* Swipe prompt dots */}
        <View style={styles.dotRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.outlineVariant }]} />
          <View style={[styles.dot, { backgroundColor: colors.outlineVariant }]} />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  swipeContainer: {
    gap: 16,
    paddingVertical: 8,
  },
  swipeCard: {
    padding: 20,
    minHeight: 290,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  statContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hugeNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    fontWeight: '800',
  },
  rightStat: {
    alignItems: 'flex-end',
  },
  avgText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    fontWeight: '800',
  },
  chartTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 18,
    letterSpacing: 0.5,
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    marginTop: 12,
  },
  chartBarColumn: {
    alignItems: 'center',
  },
  chartBar: {
    width: 16,
  },
  detailsList: {
    gap: 10,
  },
  detailsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
