import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'EventDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type RsvpType = 'Attending' | 'Not Attending' | 'Maybe';

interface EventDetails {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  posterUrl?: string;
  capacity?: number;
  entryFee?: number;
  rsvpCounts: {
    attending: number;
    notAttending: number;
    maybe: number;
  };
  attendeesList: { name: string; flat: string; status: RsvpType }[];
}

export function EventDetailScreen() {
  const route = useRoute<Rt>();
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Mock admin authorization
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [myRsvp, setMyRsvp] = useState<RsvpType | null>(null);

  const fetchEventDetails = async (id: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Simulated GET /events/{id}
      setEvent({
        id,
        title: 'Independence Day Carnival',
        description: 'Celebrate our nation\'s freedom with your fellow society neighbors! We will host a flag-hoisting ceremony in the morning, followed by delicious food stalls, music, games for kids, and cultural performances by residents in the evening. Don\'t miss out!',
        date: 'Aug 15, 2026',
        time: '08:30 AM',
        location: 'Central Lawn & Park',
        posterUrl: 'https://via.placeholder.com/600x300.png?text=Independence+Day+Carnival',
        capacity: 150,
        entryFee: 150,
        rsvpCounts: {
          attending: 42,
          notAttending: 4,
          maybe: 12,
        },
        attendeesList: [
          { name: 'Amit Shah', flat: 'A-703', status: 'Attending' },
          { name: 'Sana Khan', flat: 'C-105', status: 'Attending' },
          { name: 'Kunal Verma', flat: 'B-1102', status: 'Maybe' },
        ],
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve event details.');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEventDetails(route.params.eventId).then(() => setLoading(false));
  }, [route.params.eventId]);

  const handleRsvp = async (status: RsvpType) => {
    try {
      // Simulated POST /events/{id}/rsvp
      await new Promise((resolve) => setTimeout(resolve, 300));
      setMyRsvp(status);
      Alert.alert('Success', `You have RSVP'd as: ${status}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit RSVP.');
    }
  };

  const handleCancelEvent = async () => {
    Alert.alert('Cancel Event', 'Are you sure you want to cancel and delete this event?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            // Simulated DELETE /events/{id}
            await new Promise((resolve) => setTimeout(resolve, 400));
            Alert.alert('Success', 'Event cancelled and deleted successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch (e) {
            Alert.alert('Error', 'Failed to cancel event.');
          }
        }
      }
    ]);
  };

  if (loading || !event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Event Details" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 60 }}>
        
        {/* Poster Image */}
        {event.posterUrl ? (
          <Image source={{ uri: event.posterUrl }} style={[styles.poster, { borderRadius: radius.lg }]} resizeMode="cover" />
        ) : (
          <View style={[styles.posterPlaceholder, { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.lg }]}>
            <MaterialIcons name="event" size={48} color={colors.outline} />
          </View>
        )}

        {/* Info card */}
        <Card style={styles.card}>
          <Text style={[styles.title, { color: colors.onSurface }]}>{event.title}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <MaterialIcons name="access-time" size={16} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{event.date} @ {event.time}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={16} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{event.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="payment" size={16} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>
                Entry Fee: {event.entryFee ? `₹${event.entryFee}` : 'Free'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="people" size={16} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>
                Capacity limit: {event.capacity || 'No limit'}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>{event.description}</Text>
        </Card>

        {/* RSVP Interaction */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Your RSVP Response</Text>
          <View style={styles.rsvpRow}>
            {(['Attending', 'Maybe', 'Not Attending'] as RsvpType[]).map((r) => {
              const isSelected = myRsvp === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.rsvpButton,
                    {
                      borderColor: colors.outlineVariant,
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={() => handleRsvp(r)}
                >
                  <Text
                    style={{
                      color: isSelected ? '#FFFFFF' : colors.onSurfaceVariant,
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* RSVP Analytics */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>RSVP Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNum, { color: colors.secondary }]}>{event.rsvpCounts.attending}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Attending</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNum, { color: colors.primary }]}>{event.rsvpCounts.maybe}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Maybe</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNum, { color: colors.error }]}>{event.rsvpCounts.notAttending}</Text>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Declined</Text>
            </View>
          </View>
        </Card>

        {/* Guest list */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>Attendee List</Text>
          {event.attendeesList.map((a, idx) => (
            <View key={idx} style={[styles.attendeeRow, idx < event.attendeesList.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }]}>
              <View>
                <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{a.name}</Text>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{a.flat}</Text>
              </View>
              <Text style={{ color: a.status === 'Attending' ? colors.secondary : colors.primary, fontSize: 12, fontWeight: '700' }}>
                {a.status}
              </Text>
            </View>
          ))}
        </Card>

        {/* Admin actions */}
        {isAdmin && (
          <View style={styles.adminRow}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              onPress={() => navigation.navigate('EventCreateEdit', { eventId: event.id })}
            >
              <MaterialIcons name="edit" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>Edit Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.error, borderRadius: radius.md }]}
              onPress={handleCancelEvent}
            >
              <MaterialIcons name="cancel" size={18} color={colors.error} />
              <Text style={[styles.btnText, { color: colors.error }]}>Cancel Event</Text>
            </TouchableOpacity>
          </View>
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
  poster: {
    width: '100%',
    height: 180,
  },
  posterPlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 16,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  metaGrid: {
    gap: 8,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  rsvpButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryBox: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  adminRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
