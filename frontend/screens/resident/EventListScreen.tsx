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
  Image } from 'react-native';
import { apiClient } from '../../utils/api';

interface Event {
  id: string;
  name: string;
  description: string;
  date_time: string;
  location: string;
  poster_url?: string;
  rsvp_deadline: string;
  rsvps?: Array<{ user_id: string; status: string }>;
}

interface EventListScreenProps {
  onNavigateToScreen: (screen: string, params?: any) => void;
  onGoBack: () => void;
}

export default function EventListScreen({
  onNavigateToScreen,
  onGoBack,
}: EventListScreenProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setErrorMessage(null);
      // Fetch own profile to get society_id and user ID
      const profileRes = await apiClient.get('/residents/me/profile');
      setUserId(profileRes.data.id);
      
      const societyId = profileRes.data.society_id;
      if (societyId) {
        const response = await apiClient.get(`/events/?society_id=${societyId}`);
        setEvents(response.data);
      } else {
        setErrorMessage('You are not linked to a society.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to load events. Please try again.');
      console.error(err);
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

  const getMyRsvpStatus = (event: Event) => {
    if (!event.rsvps || !userId) return 'No Response';
    const myRsvp = event.rsvps.find(r => r.user_id === userId);
    return myRsvp ? myRsvp.status : 'No Response';
  };

  const renderItem = ({ item }: { item: Event }) => {
    const myStatus = getMyRsvpStatus(item);
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onNavigateToScreen('EventDetails', { eventId: item.id })}
        activeOpacity={0.8}
      >
        {item.poster_url ? (
          <Image source={{ uri: item.poster_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderEmoji}>🎉</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <Text style={styles.dateText}>
              📅 {new Date(item.date_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={[styles.rsvpBadge, { backgroundColor: myStatus === 'Attending' ? '#E8FDF3' : myStatus === 'Not Attending' ? '#FFECEF' : '#F1F5F9' }]}>
              <Text style={[styles.rsvpBadgeText, { color: myStatus === 'Attending' ? '#34B37A' : myStatus === 'Not Attending' ? '#E5484D' : '#64748B' }]}>
                {myStatus}
              </Text>
            </View>
          </View>

          <Text style={styles.nameText}>{item.name}</Text>
          <Text style={styles.locationText}>📍 {item.location}</Text>
          
          <Text style={styles.descText} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Society Events</Text>
        <View style={{ width: 60 }} />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

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
              <Text style={styles.emptyText}>No events scheduled currently.</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFECEF',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  cardBody: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2F6FED',
  },
  rsvpBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rsvpBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  descText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
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
