import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
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

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  posterUrl?: string;
  isUpcoming: boolean;
}

export function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(true); // Mock admin authorization

  // API mapping: GET /events/
  const loadEvents = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setEvents([
        {
          id: 'evt-101',
          title: 'Independence Day Carnival',
          description: 'Celebrate with food stalls, games, and cultural performances.',
          date: 'Aug 15, 2026',
          time: '08:30 AM',
          location: 'Central Lawn & Park',
          posterUrl: 'https://via.placeholder.com/600x300.png?text=Independence+Day+Carnival',
          isUpcoming: true,
        },
        {
          id: 'evt-102',
          title: 'Monsoon Tree Plantation Drive',
          description: 'Join hands to make our society green and sustainable.',
          date: 'Jul 26, 2026',
          time: '10:00 AM',
          location: 'Outer Boundary Gardens',
          posterUrl: 'https://via.placeholder.com/600x300.png?text=Tree+Plantation+Drive',
          isUpcoming: true,
        },
        {
          id: 'evt-103',
          title: 'Rainwater Harvesting Seminar',
          description: 'Learn about dry water prevention methods and save water.',
          date: 'Jul 20, 2026',
          time: '06:30 PM',
          location: 'Clubhouse Ground Floor',
          posterUrl: 'https://via.placeholder.com/600x300.png?text=Rainwater+Harvesting',
          isUpcoming: true,
        },
        {
          id: 'evt-104',
          title: 'Annual General Meeting',
          description: 'Discuss financial performance and committee elections.',
          date: 'Jun 28, 2026',
          time: '11:00 AM',
          location: 'Mini Amphitheatre',
          isUpcoming: false,
        },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve event list.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    loadEvents().then(() => setLoading(false));
  }, []);

  const upcomingEvents = events.filter((e) => e.isUpcoming);
  const pastEvents = events.filter((e) => !e.isUpcoming);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Events" showBack={true} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        {/* Horizontal scroll of upcoming events */}
        <View style={styles.horizontalSection}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, paddingLeft: 20 }]}>Featured Events</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalScroll, { paddingHorizontal: 20 }]}
          >
            {upcomingEvents.map((e) => (
              <TouchableOpacity
                key={e.id}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
              >
                <Card style={StyleSheet.flatten([styles.featuredCard, { borderRadius: radius.lg }])}>
                  {e.posterUrl ? (
                    <Image source={{ uri: e.posterUrl }} style={styles.featuredPoster} resizeMode="cover" />
                  ) : (
                    <View style={[styles.featuredPosterPlaceholder, { backgroundColor: colors.surfaceContainerHigh }]} />
                  )}
                  <View style={styles.featuredCardContent}>
                    <Text style={[styles.featuredTitle, { color: colors.onSurface }]} numberOfLines={1}>
                      {e.title}
                    </Text>
                    <View style={styles.featuredMeta}>
                      <MaterialIcons name="event" size={14} color={colors.primary} />
                      <Text style={[styles.featuredMetaText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                        {e.date} · {e.location}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Full list below */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, gap: spacing.md }}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>All Events</Text>
          
          {events.map((e) => (
            <TouchableOpacity
              key={e.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
            >
              <Card style={StyleSheet.flatten([styles.eventItemCard, !e.isUpcoming && { opacity: 0.6 }])}>
                <View style={styles.eventItemRow}>
                  {e.posterUrl ? (
                    <Image source={{ uri: e.posterUrl }} style={[styles.itemThumb, { borderRadius: radius.md }]} resizeMode="cover" />
                  ) : (
                    <View style={[styles.itemThumbPlaceholder, { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md }]}>
                      <MaterialIcons name="event" size={24} color={colors.outline} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.itemTitle, { color: colors.onSurface }]} numberOfLines={1}>
                      {e.title}
                    </Text>
                    <Text style={[styles.itemTime, { color: colors.primary }]} numberOfLines={1}>
                      {e.date} @ {e.time}
                    </Text>
                    <Text style={[styles.itemLocation, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                      {e.location}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FAB to create events */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EventCreateEdit', { eventId: undefined })}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalSection: {
    marginTop: 20,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  horizontalScroll: {
    gap: 16,
    paddingVertical: 8,
  },
  featuredCard: {
    width: 260,
    padding: 0,
    overflow: 'hidden',
  },
  featuredPoster: {
    width: '100%',
    height: 120,
  },
  featuredPosterPlaceholder: {
    width: '100%',
    height: 120,
  },
  featuredCardContent: {
    padding: 12,
    gap: 6,
  },
  featuredTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredMetaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  eventItemCard: {
    padding: 12,
  },
  eventItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemThumb: {
    width: 80,
    height: 80,
  },
  itemThumbPlaceholder: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  itemTime: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },
  itemLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
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
