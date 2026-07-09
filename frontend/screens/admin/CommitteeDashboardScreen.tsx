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

interface DashboardStats {
  openComplaints: number;
  upcomingEvents: number;
  totalResidents: number;
  societyName: string;
}

interface CommitteeDashboardScreenProps {
  onNavigateToTab: (tab: string) => void;
  onNavigateToScreen: (screen: string, params?: any) => void;
}

export default function CommitteeDashboardScreen({
  onNavigateToTab,
  onNavigateToScreen,
}: CommitteeDashboardScreenProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setErrorMessage(null);
      // Fetch profile to get society details
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;
      const societyName = profileRes.data.society?.name || 'HomeSync Admin';

      if (!societyId) {
        setStats({
          openComplaints: 0,
          upcomingEvents: 0,
          totalResidents: 0,
          societyName: societyName,
        });
        setLoading(false);
        return;
      }

      // Fetch complaints list to count open tickets
      const complaintsRes = await apiClient.get(`/complaints/?society_id=${societyId}`);
      const openCount = complaintsRes.data.filter((c: any) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

      // Fetch events list to count upcoming events
      const eventsRes = await apiClient.get(`/events/?society_id=${societyId}`);
      const upcomingCount = eventsRes.data.filter((e: any) => new Date(e.date_time) > new Date()).length;

      // Fetch residents directory count
      let residentsCount = 0;
      try {
        const residentsRes = await apiClient.get(`/residents?society_id=${societyId}`);
        residentsCount = residentsRes.data.length;
      } catch (e) {
        // Fallback if role is not fully elevated to Society Admin (e.g. Committee Member lacks GET /residents)
        residentsCount = 0;
      }

      setStats({
        openComplaints: openCount,
        upcomingEvents: upcomingCount,
        totalResidents: residentsCount,
        societyName: societyName,
      });
    } catch (err: any) {
      setErrorMessage('Failed to fetch dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
      >
        <View style={styles.header}>
          <Text style={styles.greetingText}>Committee Panel</Text>
          <Text style={styles.societyText}>{stats?.societyName}</Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Dashboard Grid */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: '#E5484D' }]}
            onPress={() => onNavigateToScreen('AdminComplaintsList')}
          >
            <Text style={styles.statNum}>{stats?.openComplaints || 0}</Text>
            <Text style={styles.statLabel}>Open Complaints</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: '#2F6FED' }]}
            onPress={() => onNavigateToScreen('AdminEventList')}
          >
            <Text style={styles.statNum}>{stats?.upcomingEvents || 0}</Text>
            <Text style={styles.statLabel}>Upcoming Events</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.fullWidthCard}
          onPress={() => onNavigateToScreen('ResidentDirectory')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.fullWidthCardNum}>{stats?.totalResidents || 0}</Text>
            <Text style={styles.fullWidthCardLabel}>Registered Residents</Text>
          </View>
          <Text style={styles.arrowIcon}>❯</Text>
        </TouchableOpacity>

        {/* Actions Section */}
        <Text style={styles.sectionTitle}>Administrative Actions</Text>
        
        <View style={styles.actionList}>
          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('ResidentApprovals')}>
            <Text style={styles.actionEmoji}>✍️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Resident Approvals</Text>
              <Text style={styles.actionDesc}>Approve or reject new resident sign-up requests</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('NoticeManagement')}>
            <Text style={styles.actionEmoji}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Notice Management</Text>
              <Text style={styles.actionDesc}>Create, update, or archive society notices</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('AdminEventList')}>
            <Text style={styles.actionEmoji}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Event Management</Text>
              <Text style={styles.actionDesc}>Plan new events and manage RSVPs</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  societyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  fullWidthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  fullWidthCardNum: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  fullWidthCardLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
});
