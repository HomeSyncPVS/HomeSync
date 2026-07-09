import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Image,
  Alert } from 'react-native';
import { apiClient } from '../../utils/api';

interface RSVP {
  user_id: string;
  status: string;
  additional_guests: number;
}

interface EventDetails {
  id: string;
  name: string;
  description: string;
  date_time: string;
  duration_minutes: number;
  location: string;
  poster_url?: string;
  rsvp_deadline: string;
  capacity?: number;
  entry_fee: number;
  rsvps: RSVP[];
}

interface EventDetailsScreenProps {
  route: {
    params: {
      eventId: string;
    };
  };
  onGoBack: () => void;
}

export default function EventDetailsScreen({
  route,
  onGoBack,
}: EventDetailsScreenProps) {
  const { eventId } = route.params || {};
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  const fetchEventDetails = async () => {
    try {
      // Get own profile to locate user_id
      const profileRes = await apiClient.get('/residents/me/profile');
      setUserId(profileRes.data.id);

      const response = await apiClient.get(`/events/${eventId}`);
      setEvent(response.data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve event details.');
      onGoBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const handleRsvp = async (status: 'Attending' | 'Not Attending' | 'May Be') => {
    setRsvpSubmitting(true);
    try {
      await apiClient.post(`/events/${eventId}/rsvp`, {
        status: status,
        additional_guests: 0,
      });
      // Refresh event details to update numbers
      await fetchEventDetails();
      Alert.alert('RSVP Submitted', `Your response '${status}' has been recorded.`);
    } catch (err: any) {
      Alert.alert('RSVP Error', err.response?.data?.detail || 'Failed to submit RSVP.');
    } finally {
      setRsvpSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  if (!event) return null;

  const myRsvp = event.rsvps.find(r => r.user_id === userId);
  const myStatus = myRsvp ? myRsvp.status : 'No Response';

  const attendingCount = event.rsvps.filter(r => r.status === 'Attending').length;
  const maybeCount = event.rsvps.filter(r => r.status === 'May Be').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {event.poster_url ? (
          <Image source={{ uri: event.poster_url }} style={styles.posterImage} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.placeholderEmoji}>🎉</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.nameText}>{event.name}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>📅 Date & Time</Text>
            <Text style={styles.metaValue}>
              {new Date(event.date_time).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>📍 Location</Text>
            <Text style={styles.metaValue}>{event.location}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>⏳ Duration</Text>
            <Text style={styles.metaValue}>{event.duration_minutes} minutes</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>💵 Entry Fee</Text>
            <Text style={styles.metaValue}>
              {event.entry_fee > 0 ? `$${event.entry_fee}` : 'Free'}
            </Text>
          </View>

          {event.capacity && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>👥 Capacity</Text>
              <Text style={styles.metaValue}>{event.capacity} people max</Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About the Event</Text>
          <Text style={styles.descriptionText}>{event.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Responses Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryNum}>{attendingCount}</Text>
              <Text style={styles.summaryLabelText}>Attending</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryNum}>{maybeCount}</Text>
              <Text style={styles.summaryLabelText}>Interested</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Your Attendance RSVP</Text>
          <Text style={styles.deadlineText}>
            Deadline: {new Date(event.rsvp_deadline).toLocaleDateString()}
          </Text>

          {rsvpSubmitting ? (
            <ActivityIndicator size="small" color="#2F6FED" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.rsvpActions}>
              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  styles.rsvpGoing,
                  myStatus === 'Attending' && styles.rsvpGoingActive,
                ]}
                onPress={() => handleRsvp('Attending')}
              >
                <Text style={[styles.rsvpText, myStatus === 'Attending' && styles.rsvpTextActive]}>
                  Going
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  styles.rsvpMaybe,
                  myStatus === 'May Be' && styles.rsvpMaybeActive,
                ]}
                onPress={() => handleRsvp('May Be')}
              >
                <Text style={[styles.rsvpText, myStatus === 'May Be' && styles.rsvpTextActive]}>
                  Maybe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  styles.rsvpNo,
                  myStatus === 'Not Attending' && styles.rsvpNoActive,
                ]}
                onPress={() => handleRsvp('Not Attending')}
              >
                <Text style={[styles.rsvpText, myStatus === 'Not Attending' && styles.rsvpTextActive]}>
                  Decline
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  posterImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  body: {
    padding: 24,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F6FED',
  },
  summaryLabelText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  deadlineText: {
    fontSize: 12,
    color: '#E5484D',
    fontWeight: '600',
    marginBottom: 12,
  },
  rsvpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
  },
  rsvpGoing: {
    borderColor: '#34B37A',
    backgroundColor: '#FFFFFF',
  },
  rsvpGoingActive: {
    backgroundColor: '#34B37A',
  },
  rsvpMaybe: {
    borderColor: '#64748B',
    backgroundColor: '#FFFFFF',
  },
  rsvpMaybeActive: {
    backgroundColor: '#64748B',
  },
  rsvpNo: {
    borderColor: '#E5484D',
    backgroundColor: '#FFFFFF',
  },
  rsvpNoActive: {
    backgroundColor: '#E5484D',
  },
  rsvpText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  rsvpTextActive: {
    color: '#FFFFFF',
  },
});
