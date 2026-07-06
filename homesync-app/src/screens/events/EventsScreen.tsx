import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EVENTS = [
  { id: 'independence-day', title: 'Independence Day Celebration', date: 'Aug 15, 08:30 AM', location: 'Central Park', upcoming: true },
  { id: 'agm-2026', title: 'Annual General Meeting & Town Hall', date: 'Jul 24, 06:30 PM', location: 'Community Center East Wing', upcoming: true },
  { id: 'summer-gala', title: 'Summer Solstice Rooftop Gala', date: 'Jun 21, 07:00 PM', location: 'Sky Lounge, Block A', upcoming: false },
];

export function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();

  const upcoming = EVENTS.filter((e) => e.upcoming);
  const past = EVENTS.filter((e) => !e.upcoming);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Events" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md }}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Upcoming Events</Text>
        {upcoming.map((e) => (
          <TouchableOpacity key={e.id} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}>
            <Card>
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.surfaceContainerHigh }]} />
              <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 16, marginTop: 10 }}>{e.title}</Text>
              <View style={styles.metaRow}>
                <MaterialIcons name="event" size={14} color={colors.primary} />
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{e.date}</Text>
                <MaterialIcons name="location-on" size={14} color={colors.primary} style={{ marginLeft: 8 }} />
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{e.location}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginTop: 8 }]}>Past Events</Text>
        {past.map((e) => (
          <TouchableOpacity key={e.id} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}>
            <Card style={{ opacity: 0.7 }}>
              <Text style={{ color: colors.onSurface, fontWeight: '700' }}>{e.title}</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
                {e.date} · {e.location}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  imagePlaceholder: { height: 140, borderRadius: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
});
