import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

type TabName = 'Dashboard' | 'Societies' | 'Subscriptions' | 'Analytics';

interface SocietyItem {
  id: string;
  name: string;
  plan: string;
  status: 'Active' | 'Suspended';
  residentCount: number;
  renewalDate: string;
  amountPaid: number;
}

export function SuperAdminDashboardScreen() {
  const { colors, spacing, radius } = useTheme();
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');

  // Mock data representing platform metrics
  const platformStats = {
    totalSocieties: 142,
    activeSubscriptions: 128,
    platformRevenue: '₹4,82,500',
    monthlyGrowth: '+12.4%',
  };

  const [societies, setSocieties] = useState<SocietyItem[]>([
    { id: 'soc-1', name: 'Green Valley Heights', plan: 'Premium Pro', status: 'Active', residentCount: 340, renewalDate: '2026-09-15', amountPaid: 4500 },
    { id: 'soc-2', name: 'Pinecrest Residency', plan: 'Basic Starter', status: 'Active', residentCount: 120, renewalDate: '2026-08-01', amountPaid: 1500 },
    { id: 'soc-3', name: 'Sea Breeze Apartments', plan: 'Premium Pro', status: 'Suspended', residentCount: 210, renewalDate: '2026-07-20', amountPaid: 4500 },
    { id: 'soc-4', name: 'Silver Oaks Villa Enclave', plan: 'Custom Enterprise', status: 'Active', residentCount: 88, renewalDate: '2027-01-10', amountPaid: 12000 },
  ]);

  const toggleSocietyStatus = (id: string, currentStatus: 'Active' | 'Suspended') => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    Alert.alert(
      `${nextStatus === 'Suspended' ? 'Suspend' : 'Activate'} Society`,
      `Are you sure you want to change status to ${nextStatus.toLowerCase()}?`,
      [
        { text: 'Cancel' },
        {
          text: 'Proceed',
          onPress: () => {
            setSocieties((prev) =>
              prev.map((soc) => (soc.id === id ? { ...soc, status: nextStatus } : soc))
            );
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Super Admin Panel" showBack={true} />

      {/* Segmented Top Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {(['Dashboard', 'Societies', 'Subscriptions', 'Analytics'] as TabName[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  isSelected && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isSelected ? colors.primary : colors.onSurfaceVariant,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 60 }}>

        {/* WARNING NOTE TO TEAM - STRICTLY IDENTIFIED AS CORE OWNER FOR SUPER ADMIN MODULE */}
        <Card style={{ backgroundColor: colors.primary + '0A', borderColor: colors.primary + '33', borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <MaterialIcons name="warning" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Technical Warning</Text>
          </View>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            API endpoints for Super Admin management operations do not exist in the current backend routing files yet. Currently rendering placeholder mock objects. Backend schema updates requested.
          </Text>
        </Card>

        {/* Tab 1: Dashboard */}
        {activeTab === 'Dashboard' && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.gridRow}>
              <Card style={styles.gridCard}>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Total Societies</Text>
                <Text style={[styles.statNum, { color: colors.primary }]}>{platformStats.totalSocieties}</Text>
              </Card>
              <Card style={styles.gridCard}>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Active Subscriptions</Text>
                <Text style={[styles.statNum, { color: colors.secondary }]}>{platformStats.activeSubscriptions}</Text>
              </Card>
            </View>

            <View style={styles.gridRow}>
              <Card style={styles.gridCard}>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Platform Revenue</Text>
                <Text style={[styles.statNum, { color: colors.onSurface }]}>{platformStats.platformRevenue}</Text>
              </Card>
              <Card style={styles.gridCard}>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Monthly Growth</Text>
                <Text style={[styles.statNum, { color: colors.secondary }]}>{platformStats.monthlyGrowth}</Text>
              </Card>
            </View>

            {/* Growth chart mockup card */}
            <Card style={styles.chartMockCard}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Annual Growth Chart</Text>
              <View style={[styles.chartBarContainer, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md }]}>
                {/* Simulated Chart Bars */}
                {[30, 45, 60, 55, 70, 85, 95].map((val, i) => (
                  <View key={i} style={styles.chartBarColumn}>
                    <View style={[styles.chartBar, { height: val, backgroundColor: colors.primary, borderRadius: radius.sm }]} />
                    <Text style={{ color: colors.outline, fontSize: 10, marginTop: 4 }}>M{i + 1}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Tab 2: Society Management */}
        {activeTab === 'Societies' && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Society Directory</Text>
            {societies.map((soc) => (
              <Card key={soc.id} style={styles.socCard}>
                <View style={styles.socCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.socName, { color: colors.onSurface }]}>{soc.name}</Text>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                      {soc.plan} · {soc.residentCount} Residents
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: soc.status === 'Active' ? colors.secondary + '1A' : colors.error + '1A' },
                    ]}
                  >
                    <Text style={{ color: soc.status === 'Active' ? colors.secondary : colors.error, fontSize: 11, fontWeight: '700' }}>
                      {soc.status}
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { borderColor: soc.status === 'Active' ? colors.error : colors.secondary, borderWidth: 1, borderRadius: radius.sm },
                    ]}
                    onPress={() => toggleSocietyStatus(soc.id, soc.status)}
                  >
                    <Text style={{ color: soc.status === 'Active' ? colors.error : colors.secondary, fontSize: 12, fontWeight: '600' }}>
                      {soc.status === 'Active' ? 'Suspend Society' : 'Activate Society'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 3: Subscription Management */}
        {activeTab === 'Subscriptions' && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Billing Cycles</Text>
            {societies.map((soc) => (
              <Card key={soc.id} style={styles.billingCard}>
                <View style={styles.billingHeader}>
                  <Text style={[styles.billingSocName, { color: colors.onSurface }]}>{soc.name}</Text>
                  <Text style={{ color: colors.secondary, fontWeight: '700', fontSize: 14 }}>
                    ₹{soc.amountPaid}/yr
                  </Text>
                </View>
                <View style={styles.billingDetails}>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                    Billing Type Plan: <Text style={{ color: colors.onSurface, fontWeight: '600' }}>{soc.plan}</Text>
                  </Text>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
                    Next Renewal Date: <Text style={{ color: colors.onSurface, fontWeight: '600' }}>{soc.renewalDate}</Text>
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Tab 4: Platform Analytics */}
        {activeTab === 'Analytics' && (
          <View style={{ gap: spacing.md }}>
            <Card style={styles.analyticsCard}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Revenue Metrics</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginTop: 4 }}>
                Averaged monthly platform growth is steady at +12% since launch.
              </Text>
              <View style={[styles.analyticsChartMock, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md }]}>
                <MaterialIcons name="trending-up" size={48} color={colors.primary} />
                <Text style={{ color: colors.onSurface, fontWeight: '600', marginTop: 8 }}>+₹45,000 New Subscriptions This Week</Text>
              </View>
            </Card>

            <Card style={styles.analyticsCard}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Retention & Churn</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginTop: 4 }}>
                Platform churn rate is minimized below 2.4% annually.
              </Text>
              <View style={[styles.analyticsChartMock, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md }]}>
                <MaterialIcons name="security" size={48} color={colors.secondary} />
                <Text style={{ color: colors.onSurface, fontWeight: '600', marginTop: 8 }}>97.6% Customer Renewal Rate</Text>
              </View>
            </Card>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 52,
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 20,
  },
  tabItem: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
  statNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    fontWeight: '800',
  },
  chartMockCard: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  chartBarContainer: {
    height: 140,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 10,
    marginTop: 14,
  },
  chartBarColumn: {
    alignItems: 'center',
  },
  chartBar: {
    width: 20,
  },
  socCard: {
    padding: 16,
  },
  socCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  socName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  billingCard: {
    padding: 16,
    gap: 12,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billingSocName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  billingDetails: {
    gap: 4,
  },
  analyticsCard: {
    padding: 16,
  },
  analyticsChartMock: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
});
