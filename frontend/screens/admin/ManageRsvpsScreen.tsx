import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl } from 'react-native';
import { apiClient } from '../../utils/api';

interface RSVP {
  id: string;
  user_id: string;
  status: string;
  additional_guests: number;
  user_name?: string;
  flat_info?: string;
}

interface ManageRsvpsScreenProps {
  route: {
    params: {
      eventId: string;
    };
  };
  onGoBack: () => void;
}

export default function ManageRsvpsScreen({
  route,
  onGoBack,
}: ManageRsvpsScreenProps) {
  const { eventId } = route.params || {};
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Attending' | 'May Be' | 'Not Attending'>('Attending');

  const fetchRsvps = async () => {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      const eventData = response.data;
      const rawRsvps = eventData.rsvps || [];
      
      // Attempt to load resident profiles for each RSVP user to display their names/flats
      const enrichedRsvps = await Promise.all(
        rawRsvps.map(async (rsvp: any) => {
          try {
            const resProfile = await apiClient.get(`/residents/${rsvp.user_id}`);
            return {
              ...rsvp,
              user_name: resProfile.data.full_name,
              flat_info: `${resProfile.data.flat?.floor?.wing?.name || ''}-${resProfile.data.flat?.number || ''}`,
            };
          } catch (e) {
            return {
              ...rsvp,
              user_name: 'Resident',
              flat_info: 'Unknown Flat',
            };
          }
        })
      );

      setRsvps(enrichedRsvps);
    } catch (err) {
      console.error('Failed to load RSVPs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRsvps();
  }, [eventId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRsvps();
  };

  const filteredRsvps = rsvps.filter(r => r.status === activeTab);

  const renderItem = ({ item }: { item: RSVP }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nameText}>{item.user_name}</Text>
        <Text style={styles.flatText}>Flat: {item.flat_info}</Text>
      </View>
      {item.additional_guests > 0 && (
        <View style={styles.guestsBadge}>
          <Text style={styles.guestsText}>+{item.additional_guests} Guests</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event RSVPs</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['Attending', 'May Be', 'Not Attending'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'Attending' ? 'Going' : tab === 'May Be' ? 'Maybe' : 'Declined'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={filteredRsvps}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No responses for this status.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#2F6FED',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2F6FED',
  },
  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2F6FED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  flatText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  guestsBadge: {
    backgroundColor: '#E8FDF3',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  guestsText: {
    fontSize: 11,
    color: '#34B37A',
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
