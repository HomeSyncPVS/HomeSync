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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TabName = 'Active' | 'Archive';

interface Notice {
  id: string;
  title: string;
  body: string;
  type: 'Emergency' | 'General' | 'Event' | 'Maintenance';
  targetGroup: string;
  expiryDate: string;
  attachmentUrl?: string;
  datePosted: string;
}

export function NoticesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('Active');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAdmin, setIsAdmin] = useState(true); // Mock admin authorization

  // API mapping: GET /notices/ (Active) vs GET /notices/archive (Archive)
  const fetchNotices = async (tab: TabName) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      if (tab === 'Active') {
        setNotices([
          {
            id: 'not-101',
            title: 'Emergency Water Tank Cleaning',
            body: 'Water supply to all blocks will be temporarily shut off tomorrow from 9:00 AM to 1:00 PM for scheduled cleaning of the overhead tanks.',
            type: 'Emergency',
            targetGroup: 'All Blocks',
            expiryDate: 'Jul 10, 2026',
            attachmentUrl: 'https://example.com/cleaning_schedule.pdf',
            datePosted: 'Today, 10:00 AM',
          },
          {
            id: 'not-102',
            title: 'Independence Day Prep Meeting',
            body: 'We request all committee members and interested volunteers to gather in the mini clubhouse to coordinate the cultural flag-hoisting activities.',
            type: 'Event',
            targetGroup: 'Committee & Volunteers',
            expiryDate: 'Aug 14, 2026',
            datePosted: 'Yesterday',
          },
          {
            id: 'not-103',
            title: 'Elevator Maintenance Scheduled',
            body: 'The passenger lift in Block A will undergo routine diagnostic checks and cable tightening by OTIS technicians.',
            type: 'Maintenance',
            targetGroup: 'Block A Residents',
            expiryDate: 'Jul 12, 2026',
            datePosted: 'Jul 06, 2026',
          },
        ]);
      } else {
        setNotices([
          {
            id: 'not-098',
            title: 'Dry Waste Collection Guidelines',
            body: 'Effective immediately, segregation of wet and dry waste is mandatory under BMC regulations. Please check the rules.',
            type: 'General',
            targetGroup: 'All Residents',
            expiryDate: 'Jul 01, 2026',
            attachmentUrl: 'https://example.com/waste_guidelines.pdf',
            datePosted: 'Jun 15, 2026',
          },
          {
            id: 'not-099',
            title: 'Annual General Body Meeting',
            body: 'All registered flat owners are invited to attend the Annual General Body meeting scheduled in the main garden lawn area.',
            type: 'General',
            targetGroup: 'Owners Only',
            expiryDate: 'Jul 05, 2026',
            datePosted: 'Jun 20, 2026',
          },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve notices.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotices(activeTab);
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchNotices(activeTab).then(() => setLoading(false));
  }, [activeTab]);

  const getNoticeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    if (type === 'Emergency') return 'error-outline';
    if (type === 'Event') return 'event';
    if (type === 'Maintenance') return 'construction';
    return 'info-outline';
  };

  const getNoticeColor = (type: string) => {
    if (type === 'Emergency') return colors.error;
    if (type === 'Event') return colors.secondary;
    if (type === 'Maintenance') return colors.primary;
    return colors.onSurfaceVariant;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Notices" showBack={true} />

      {/* Tabs Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        {(['Active', 'Archive'] as TabName[]).map((tab) => {
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
                {tab} Notices
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : notices.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialIcons name="campaign" size={48} color={colors.outline} />
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>No notices active</Text>
          </Card>
        ) : (
          notices.map((n) => (
            <TouchableOpacity
              key={n.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('NoticeDetail', { noticeId: n.id })}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.noticeCard,
                  n.type === 'Emergency' && activeTab === 'Active' && { borderColor: colors.error, borderWidth: 1 },
                ])}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: getNoticeColor(n.type) + '1A' }]}>
                    <MaterialIcons name={getNoticeIcon(n.type)} size={12} color={getNoticeColor(n.type)} />
                    <Text style={[styles.badgeText, { color: getNoticeColor(n.type) }]}>{n.type}</Text>
                  </View>
                  <Text style={[styles.dateText, { color: colors.outline }]}>{n.datePosted}</Text>
                </View>

                <Text style={[styles.noticeTitle, { color: colors.onSurface }]}>{n.title}</Text>
                
                <Text style={[styles.noticeBody, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                  {n.body}
                </Text>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="people" size={14} color={colors.outline} />
                    <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{n.targetGroup}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="event-busy" size={14} color={colors.outline} />
                    <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>Expires: {n.expiryDate}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB - Admin Create triggers Form */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('NoticeCreateEdit', { noticeId: undefined })}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 52,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  noticeCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  noticeTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  noticeBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6FED',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
