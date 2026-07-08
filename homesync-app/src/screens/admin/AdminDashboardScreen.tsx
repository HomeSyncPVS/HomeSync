import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

interface SocietyStats {
  openComplaints: number;
  pendingApprovals: number;
  activeNotices: number;
  upcomingEvents: number;
}

interface RecentActivity {
  id: string;
  type: 'complaint' | 'approval' | 'notice' | 'event';
  title: string;
  subtitle: string;
  time: string;
  status?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export function AdminDashboardScreen() {
  const { colors, spacing, radius } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Committee Member');
  const [societyName, setSocietyName] = useState('My Society');
  const [stats, setStats] = useState<SocietyStats>({
    openComplaints: 0,
    pendingApprovals: 0,
    activeNotices: 0,
    upcomingEvents: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Function to fetch greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 17) return 'Good Afternoon ☀️';
    if (hour < 21) return 'Good Evening 🌇';
    return 'Good Night 🌙';
  };

  // Mock API mapping - Combines client-side responses from different endpoints
  const fetchDashboardData = async () => {
    try {
      // In a real app, this would perform async fetch requests:
      // 1. GET /auth/me -> Admin details & society info
      // 2. GET /complaints/ -> filter pending/open
      // 3. GET /residents?approval_status=PENDING -> unapproved counts
      // 4. GET /notices/ -> active notices count
      // 5. GET /events/ -> upcoming events count
      
      // Simulate API lag
      await new Promise((resolve) => setTimeout(resolve, 800));

      setAdminName('Rajesh Kumar');
      setSocietyName('Green Valley Heights');
      setStats({
        openComplaints: 8,
        pendingApprovals: 3,
        activeNotices: 5,
        upcomingEvents: 2,
      });

      setRecentActivities([
        {
          id: 'act-1',
          type: 'approval',
          title: 'Aman Gupta requested to join',
          subtitle: 'Wing B · Flat 402',
          time: '15m ago',
          icon: 'person-add',
        },
        {
          id: 'act-2',
          type: 'complaint',
          title: 'Elevator B-2 Stuck',
          subtitle: 'Reported by Flat 801 · Urgent',
          time: '30m ago',
          status: 'Critical',
          icon: 'elevator',
        },
        {
          id: 'act-3',
          type: 'notice',
          title: 'Water supply interruption notice posted',
          subtitle: 'Maintenance scheduled for July 9',
          time: '2h ago',
          icon: 'campaign',
        },
        {
          id: 'act-4',
          type: 'event',
          title: 'Town Hall Meeting RSVP Active',
          subtitle: '12 residents confirmed attending',
          time: '5h ago',
          icon: 'event',
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch dashboard data. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData().then(() => setLoading(false));
  }, []);

  const handleQuickAction = (actionName: string) => {
    Alert.alert('Action Triggered', `${actionName} workflow would be initiated.`);
  };

  if (loading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Society Header Details strictly as per guidelines */}
      <View style={[styles.headerSection, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.societyName, { color: colors.onSurface }]}>{societyName}</Text>
          <Text style={[styles.greetingText, { color: colors.onSurfaceVariant }]}>
            {getGreeting()}, {adminName}
          </Text>
        </View>
        <TouchableOpacity style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {societyName.split(' ').map((word) => word[0]).slice(0, 2).join('')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        {/* Stat Cards - 2x2 Grid */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Society Overview</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <Card style={styles.gridCard}>
                <View style={[styles.cardHeader, { backgroundColor: colors.error + '1A' }]}>
                  <MaterialIcons name="report-problem" size={20} color={colors.error} />
                </View>
                <Text style={[styles.statNumber, { color: colors.onSurface }]}>{stats.openComplaints}</Text>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Open Complaints</Text>
              </Card>

              <Card style={styles.gridCard}>
                <View style={[styles.cardHeader, { backgroundColor: colors.primary + '1A' }]}>
                  <MaterialIcons name="person-add" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.onSurface }]}>{stats.pendingApprovals}</Text>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Pending Approvals</Text>
              </Card>
            </View>

            <View style={styles.gridRow}>
              <Card style={styles.gridCard}>
                <View style={[styles.cardHeader, { backgroundColor: colors.secondary + '1A' }]}>
                  <MaterialIcons name="campaign" size={20} color={colors.secondary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.onSurface }]}>{stats.activeNotices}</Text>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Active Notices</Text>
              </Card>

              <Card style={styles.gridCard}>
                <View style={[styles.cardHeader, { backgroundColor: '#FF9500' + '1A' }]}>
                  <MaterialIcons name="event" size={20} color="#FF9500" />
                </View>
                <Text style={[styles.statNumber, { color: colors.onSurface }]}>{stats.upcomingEvents}</Text>
                <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Upcoming Events</Text>
              </Card>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('Generate Bills')}
            >
              <Card style={styles.actionCard}>
                <View style={[styles.actionIconBox, { backgroundColor: colors.primary + '1A' }]}>
                  <MaterialIcons name="receipt-long" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.actionText, { color: colors.onSurface }]}>Generate Bills</Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction('Publish Notice')}
            >
              <Card style={styles.actionCard}>
                <View style={[styles.actionIconBox, { backgroundColor: colors.secondary + '1A' }]}>
                  <MaterialIcons name="add-alert" size={24} color={colors.secondary} />
                </View>
                <Text style={[styles.actionText, { color: colors.onSurface }]}>Publish Notice</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity List */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>Recent Activity</Text>
          <Card style={{ padding: spacing.xs }}>
            {recentActivities.map((activity, index) => (
              <View
                key={activity.id}
                style={[
                  styles.activityRow,
                  index < recentActivities.length - 1 && { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1 },
                ]}
              >
                <View
                  style={[
                    styles.activityIconBox,
                    {
                      backgroundColor:
                        activity.type === 'complaint'
                          ? colors.error + '1A'
                          : activity.type === 'approval'
                          ? colors.primary + '1A'
                          : activity.type === 'notice'
                          ? colors.secondary + '1A'
                          : '#FF95001A',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={activity.icon}
                    size={20}
                    color={
                      activity.type === 'complaint'
                        ? colors.error
                        : activity.type === 'approval'
                        ? colors.primary
                        : activity.type === 'notice'
                        ? colors.secondary
                        : '#FF9500'
                    }
                  />
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={[styles.activityTitle, { color: colors.onSurface }]} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text style={[styles.activityTime, { color: colors.outline }]}>{activity.time}</Text>
                  </View>
                  <Text style={[styles.activitySubtitle, { color: colors.onSurfaceVariant }]}>
                    {activity.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  societyName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    fontWeight: '800',
  },
  greetingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  cardHeader: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
  },
  actionCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  activityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  activityTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginLeft: 8,
  },
  activitySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});

