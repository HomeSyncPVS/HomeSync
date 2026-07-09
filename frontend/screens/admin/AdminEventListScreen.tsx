import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Image,
  Alert } from 'react-native';
import { apiClient } from '../../utils/api';

interface Event {
  id: string;
  name: string;
  description: string;
  date_time: string;
  location: string;
  poster_url?: string;
  rsvps?: Array<{ status: string }>;
}

interface AdminEventListScreenProps {
  onNavigateToScreen: (screen: string, params?: any) => void;
  onGoBack: () => void;
}

export default function AdminEventListScreen({
  onNavigateToScreen,
  onGoBack,
}: AdminEventListScreenProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;

      if (societyId) {
        const response = await apiClient.get(`/events/?society_id=${societyId}`);
        setEvents(response.data);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel and delete this event? This will remove all RSVPs.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Event',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.delete(`/events/${id}`);
              fetchEvents();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to cancel event.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Event }) => {
    const goingCount = item.rsvps?.filter(r => r.status === 'Attending').length || 0;
    const maybeCount = item.rsvps?.filter(r => r.status === 'May Be').length || 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.nameText}>{item.name}</Text>
          <Text style={styles.dateText}>
            📅 {new Date(item.date_time).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.locationText}>📍 {item.location}</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Going: {goingCount} • Interested: {maybeCount}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigateToScreen('ManageRsvps', { eventId: item.id })}
          >
            <Text style={styles.actionText}>RSVPs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigateToScreen('CreateEvent', { eventId: item.id })}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={() => onNavigateToScreen('EventGallery', { eventId: item.id })}
          >
            <Text style={styles.actionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={[styles.actionText, { color: '#E5484D' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Events</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events scheduled.</Text>
            </View>
          }
        />
      )}

      {/* FAB to Create Event */}
      <TouchableOpacity style={styles.fab} onPress={() => onNavigateToScreen('CreateEvent')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F6FED',
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  summaryRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  galleryButton: {
    backgroundColor: '#E8FDF3',
  },
  cancelButton: {
    backgroundColor: '#FFECEF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2F6FED',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
});
