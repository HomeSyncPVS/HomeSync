import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar } from 'react-native';
import { superadminApi, PlatformStats } from '../../api/superadmin.mock';

interface SuperAdminDashboardScreenProps {
  onNavigateToScreen: (screen: string, params?: any) => void;
  onLogout: () => void;
}

export default function SuperAdminDashboardScreen({
  onNavigateToScreen,
  onLogout,
}: SuperAdminDashboardScreenProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await superadminApi.getStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.titleText}>Super Admin Console</Text>
            <Text style={styles.subtitleText}>Platform-wide metrics & operations</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardVal}>{stats?.totalSocieties}</Text>
            <Text style={styles.cardLabel}>Total Societies</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardVal}>{stats?.totalResidents}</Text>
            <Text style={styles.cardLabel}>Active Residents</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardVal}>${stats?.totalRevenue?.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>Platform Revenue</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardVal}>{stats?.activeSubscriptions}</Text>
            <Text style={styles.cardLabel}>Subscriptions</Text>
          </View>
        </View>

        {/* Navigation Actions */}
        <Text style={styles.sectionTitle}>Global Management</Text>
        <View style={styles.actionList}>
          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('SocietyManagement')}>
            <Text style={styles.actionEmoji}>🏢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Society Registrations</Text>
              <Text style={styles.actionDesc}>View registered societies platform-wide</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('SubscriptionManagement')}>
            <Text style={styles.actionEmoji}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Subscription Plans</Text>
              <Text style={styles.actionDesc}>Manage tenant subscription states and renewals</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('PlatformAnalytics')}>
            <Text style={styles.actionEmoji}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Platform Analytics</Text>
              <Text style={styles.actionDesc}>View metrics aggregated across societies</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('RolesPermissions')}>
            <Text style={styles.actionEmoji}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Roles & Permissions Matrix</Text>
              <Text style={styles.actionDesc}>Configure capabilities for tenant roles</Text>
            </View>
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateToScreen('AuditLogs')}>
            <Text style={styles.actionEmoji}>📜</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Global Audit Trail</Text>
              <Text style={styles.actionDesc}>Track administrative actions platform-wide</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFECEF',
    borderRadius: 8,
  },
  logoutText: {
    color: '#E5484D',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeBanner: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  badgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  card: {
    width: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  cardLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
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
