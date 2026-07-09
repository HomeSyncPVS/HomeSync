import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar } from 'react-native';
import { apiClient } from '../../utils/api';

interface DashboardData {
  profile: {
    full_name: string;
    email: string;
    phone: string;
    wing_name?: string;
    floor_number?: number;
    flat_number?: string;
    society_name?: string;
  };
  outstanding_bills_count: number;
  total_outstanding_amount: number;
  open_complaints_count: number;
}

interface NoticeSummary {
  id: string;
  title: string;
  date: string;
}

interface ResidentDashboardScreenProps {
  onNavigateToTab: (tab: string) => void;
  onNavigateToScreen: (screen: string, params?: any) => void;
}

export default function ResidentDashboardScreen({
  onNavigateToTab,
  onNavigateToScreen,
}: ResidentDashboardScreenProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentNotices, setRecentNotices] = useState<NoticeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setErrorMessage(null);
      // Fetch profile & dashboard stats from backend
      const profileRes = await apiClient.get('/residents/me/profile');
      const statsRes = await apiClient.get('/residents/me/dashboard');
      
      const profile = profileRes.data;
      const stats = statsRes.data;

      setDashboardData({
        profile: {
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || '',
          wing_name: profile.flat?.floor?.wing?.name,
          floor_number: profile.flat?.floor?.number,
          flat_number: profile.flat?.number,
          society_name: profile.society?.name || 'HomeSync Society',
        },
        outstanding_bills_count: stats.outstanding_bills_count ?? 0,
        total_outstanding_amount: stats.total_outstanding_amount ?? 0,
        open_complaints_count: stats.open_complaints_count ?? 0,
      });

      // Fetch active notices
      if (profile.society_id) {
        const noticesRes = await apiClient.get(`/notices/?society_id=${profile.society_id}`);
        setRecentNotices(noticesRes.data.slice(0, 3));
      }
    } catch (err: any) {
      setErrorMessage('Failed to fetch dashboard data. Please try again.');
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  const profile = dashboardData?.profile;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello, {profile?.full_name?.split(' ')[0] || 'Resident'}</Text>
            <Text style={styles.societyText}>
              {profile?.society_name} • Flat {profile?.wing_name || ''}-{profile?.flat_number || ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.avatarButton} onPress={() => onNavigateToTab('profile')}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'R'}</Text>
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Outstanding Bill Summary Card */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Outstanding Balance</Text>
          <Text style={styles.billAmount}>
            ${dashboardData?.total_outstanding_amount?.toLocaleString() || '0.00'}
          </Text>
          <View style={styles.billFooter}>
            <Text style={styles.billCountText}>
              {dashboardData?.outstanding_bills_count || 0} unpaid maintenance bill(s)
            </Text>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => onNavigateToTab('bills')}
            >
              <Text style={styles.payButtonText}>View Bills</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Action Buttons Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigateToScreen('RaiseComplaint')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFECEF' }]}>
              <Text style={{ fontSize: 20 }}>📢</Text>
            </View>
            <Text style={styles.gridLabel}>Raise Complaint</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigateToScreen('NoticeList')}>
            <View style={[styles.iconCircle, { backgroundColor: '#EBF3FF' }]}>
              <Text style={{ fontSize: 20 }}>📋</Text>
            </View>
            <Text style={styles.gridLabel}>Notices</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => onNavigateToScreen('EventList')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8FDF3' }]}>
              <Text style={{ fontSize: 20 }}>🎉</Text>
            </View>
            <Text style={styles.gridLabel}>Events</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowGrid}>
          <TouchableOpacity style={styles.rowItem} onPress={() => onNavigateToScreen('FamilyMembers')}>
            <Text style={styles.rowItemEmoji}>👥</Text>
            <Text style={styles.rowItemText}>Family Members</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowItem} onPress={() => onNavigateToScreen('Vehicles')}>
            <Text style={styles.rowItemEmoji}>🚗</Text>
            <Text style={styles.rowItemText}>Vehicles</Text>
          </TouchableOpacity>
        </View>

        {/* Notices Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Notices</Text>
          <TouchableOpacity onPress={() => onNavigateToScreen('NoticeList')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentNotices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent notices from management.</Text>
          </View>
        ) : (
          recentNotices.map((notice) => (
            <TouchableOpacity
              key={notice.id}
              style={styles.noticeListItem}
              onPress={() => onNavigateToScreen('NoticeDetails', { noticeId: notice.id })}
            >
              <View style={styles.noticeDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeItemTitle} numberOfLines={1}>
                  {notice.title}
                </Text>
                <Text style={styles.noticeItemDate}>{notice.date}</Text>
              </View>
              <Text style={styles.arrowText}>❯</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    fontFamily: 'System',
  },
  societyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2F6FED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  errorBanner: {
    backgroundColor: '#FFECEF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  billTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  billAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    marginVertical: 10,
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  billCountText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  payButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#2F6FED',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  rowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rowItem: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  rowItemEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  rowItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  noticeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F6FED',
    marginRight: 12,
  },
  noticeItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  noticeItemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  arrowText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
});
