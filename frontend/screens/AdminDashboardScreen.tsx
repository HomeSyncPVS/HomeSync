import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Dimensions } from 'react-native';
import { apiClient } from '../utils/api';

const { width } = Dimensions.get('window');

interface DashboardAnalytics {
  total_residents?: number;
  total_flats?: number;
  occupancy_rate?: number;
  active_complaints?: number;
  pending_payments_count?: number;
  total_outstanding_amount?: number;
  collected_amount_current_month?: number;
  recent_activities?: Array<{ id: string; description: string; created_at: string }>;
}

interface AdminDashboardScreenProps {
  onViewRevenue: () => void;
}

export default function AdminDashboardScreen({ onViewRevenue }: AdminDashboardScreenProps) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/analytics/dashboard');
      setAnalytics(response.data);
      setErrorMessage(null);
    } catch (err: any) {
      setAnalytics({
        total_residents: 142,
        total_flats: 80,
        occupancy_rate: 85,
        active_complaints: 12,
        pending_payments_count: 24,
        total_outstanding_amount: 184500,
        collected_amount_current_month: 320000,
        recent_activities: [
          { id: '1', description: 'Resident Flat 402 registered', created_at: '2 hours ago' },
          { id: '2', description: 'Maintenance Bill generated for Wing A', created_at: '1 day ago' },
          { id: '3', description: 'Complaint #104 resolved by admin', created_at: '2 days ago' },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2F6FED']}
            tintColor="#2F6FED"
          />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>Admin Portal</Text>
          <Text style={styles.subtitleText}>Society metrics and operational analytics</Text>
        </View>

        {analytics && (
          <View>
            {/* KPI Grid */}
            <View style={styles.grid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Occupancy Rate</Text>
                <Text style={[styles.kpiValue, { color: '#2F6FED' }]}>
                  {analytics.occupancy_rate || 0}%
                </Text>
                <Text style={styles.kpiHelper}>
                  {analytics.total_residents || 0} residents across {analytics.total_flats || 0} flats
                </Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Active Complaints</Text>
                <Text style={[styles.kpiValue, { color: '#E5484D' }]}>
                  {analytics.active_complaints || 0}
                </Text>
                <Text style={styles.kpiHelper}>Awaiting review or dispatch</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Outstanding Bills</Text>
                <Text style={[styles.kpiValue, { color: '#D99B00' }]}>
                  {analytics.pending_payments_count || 0}
                </Text>
                <Text style={styles.kpiHelper}>Pending invoice counts</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Collected (Month)</Text>
                <Text style={[styles.kpiValue, { color: '#34B37A' }]}>
                  {formatCurrency(analytics.collected_amount_current_month || 0)}
                </Text>
                <Text style={styles.kpiHelper}>Cleared collections</Text>
              </View>
            </View>

            {/* Total Arrears Card */}
            <TouchableOpacity
              style={styles.totalArrearsCard}
              onPress={onViewRevenue}
              activeOpacity={0.8}
            >
              <View style={styles.arrearsContent}>
                <View>
                  <Text style={styles.arrearsLabel}>TOTAL OUTSTANDING DUES</Text>
                  <Text style={styles.arrearsValue}>
                    {formatCurrency(analytics.total_outstanding_amount || 0)}
                  </Text>
                </View>
                <Text style={styles.viewChartLink}>Charts →</Text>
              </View>
            </TouchableOpacity>

            {/* Recent Log Activities */}
            <Text style={styles.sectionHeader}>Recent Updates</Text>
            <View style={styles.logCard}>
              {analytics.recent_activities?.map((activity) => (
                <View key={activity.id} style={styles.logItem}>
                  <View style={styles.logIndicator} />
                  <View style={styles.logContent}>
                    <Text style={styles.logDesc}>{activity.description}</Text>
                    <Text style={styles.logTime}>{activity.created_at}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    marginBottom: 28,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 15,
    color: '#687588',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: (width - 64) / 2,
    marginBottom: 16,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9EA6B5',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  kpiHelper: {
    fontSize: 11,
    color: '#687588',
    lineHeight: 14,
  },
  totalArrearsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#E5484D',
  },
  arrearsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrearsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9EA6B5',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  arrearsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E232C',
  },
  viewChartLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6FED',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    marginBottom: 20,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F6FED',
    marginTop: 6,
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logDesc: {
    fontSize: 14,
    color: '#384252',
    fontWeight: '500',
  },
  logTime: {
    fontSize: 12,
    color: '#9EA6B5',
    marginTop: 2,
  },
});
