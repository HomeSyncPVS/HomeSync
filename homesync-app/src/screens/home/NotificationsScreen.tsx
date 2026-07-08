import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'bill' | 'complaint' | 'notice' | 'event' | 'approval';
  isUnread: boolean;
}

interface GroupedNotifications {
  timeframe: 'Today' | 'Yesterday' | 'This Week';
  data: NotificationItem[];
}

export function NotificationsScreen() {
  const { colors, spacing, radius } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<GroupedNotifications[]>([]);

  // Simulated API mapping: GET /residents/me/notifications
  const fetchNotifications = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setNotifications([
        {
          timeframe: 'Today',
          data: [
            {
              id: 'notif-1',
              title: 'Maintenance Bill Generated',
              body: 'Your maintenance bill of ₹4,500 for August 2026 has been generated.',
              timestamp: '10:30 AM',
              type: 'bill',
              isUnread: true,
            },
            {
              id: 'notif-2',
              title: 'Plumber Assigned to Complaint',
              body: 'Robert Harrison has been assigned to your sink leak ticket CMP-5103.',
              timestamp: '09:15 AM',
              type: 'complaint',
              isUnread: true,
            },
          ],
        },
        {
          timeframe: 'Yesterday',
          data: [
            {
              id: 'notif-3',
              title: 'Water Supply Notice Posted',
              body: 'Emergency water tank cleaning schedule is active for July 9.',
              timestamp: '04:20 PM',
              type: 'notice',
              isUnread: false,
            },
          ],
        },
        {
          timeframe: 'This Week',
          data: [
            {
              id: 'notif-4',
              title: 'Independence Day Carnival RSVP Active',
              body: 'Confirm your attending status for the August 15 cultural festival.',
              timestamp: 'Jul 05, 2026',
              type: 'event',
              isUnread: false,
            },
            {
              id: 'notif-5',
              title: 'Flat Approval Requested',
              body: 'Your request to register wing flat Unit B-402 is pending review.',
              timestamp: 'Jul 04, 2026',
              type: 'approval',
              isUnread: false,
            },
          ],
        },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve notifications.');
    }
  };

  // Simulated API mapping: PUT /residents/me/notifications/{id}/read
  const handleMarkAsRead = async (id: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setNotifications((prev) =>
        prev.map((group) => ({
          ...group,
          data: group.data.map((item) =>
            item.id === id ? { ...item, isUnread: false } : item
          ),
        }))
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to mark notification as read.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchNotifications().then(() => setLoading(false));
  }, []);

  const getNotifIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'bill': return 'receipt';
      case 'complaint': return 'report-problem';
      case 'notice': return 'campaign';
      case 'event': return 'event';
      default: return 'verified-user';
    }
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'bill': return colors.primary;
      case 'complaint': return colors.error;
      case 'notice': return colors.secondary;
      case 'event': return '#FF9500';
      default: return colors.primary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Notifications" showBack={true} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        {/* Warning Note to Team: Maps to residents.py routes owned by Vedant */}
        <Card style={{ backgroundColor: colors.primary + '0A', borderColor: colors.primary + '33', borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <MaterialIcons name="warning" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Ownership Note</Text>
          </View>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            These notification routes map to GET/PUT endpoints in residents.py. Coordinate with Vedant to ensure integration.
          </Text>
        </Card>

        {notifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialIcons name="notifications-off" size={48} color={colors.outline} />
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>All caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              No new alerts or notification messages found.
            </Text>
          </Card>
        ) : (
          notifications.map((group) => {
            if (group.data.length === 0) return null;
            return (
              <View key={group.timeframe} style={{ gap: spacing.sm }}>
                <Text style={[styles.timeframeTitle, { color: colors.outline }]}>{group.timeframe}</Text>
                <Card style={{ padding: spacing.xs }}>
                  {group.data.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.9}
                      onPress={() => item.isUnread && handleMarkAsRead(item.id)}
                    >
                      <View
                        style={[
                          styles.notifRow,
                          idx < group.data.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
                        ]}
                      >
                        <View style={[styles.iconBox, { backgroundColor: getNotifColor(item.type) + '1A' }]}>
                          <MaterialIcons name={getNotifIcon(item.type)} size={18} color={getNotifColor(item.type)} />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={styles.notifHeader}>
                            <Text style={[styles.notifTitle, { color: colors.onSurface }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.notifTime, { color: colors.outline }]}>{item.timestamp}</Text>
                          </View>
                          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, lineHeight: 18 }}>
                            {item.body}
                          </Text>
                        </View>

                        {item.isUnread && (
                          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeframeTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  notifTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
});
