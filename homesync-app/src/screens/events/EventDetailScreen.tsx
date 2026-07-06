import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'EventDetail'>;
type Rsvp = 'Attending' | 'Maybe' | 'Not Attending';

export function EventDetailScreen() {
  const route = useRoute<Rt>();
  const { colors, spacing } = useTheme();
  const [rsvp, setRsvp] = useState<Rsvp>('Attending');
  const [guests, setGuests] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    // TODO: wire to POST /events/{id}/rsvp once backend is live
    setSubmitted(true);
    Alert.alert('RSVP confirmed', `You're marked as "${rsvp}" with ${guests} guest(s).`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Event Details" rightIcon="share" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md }}>
        <View style={[styles.coverPlaceholder, { backgroundColor: colors.surfaceContainerHigh }]} />

        <View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Independence Day Celebration</Text>
          <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>Event ID: {route.params.eventId}</Text>
        </View>

        <View style={styles.infoGrid}>
          <Card style={{ flex: 1 }}>
            <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11, marginTop: 6 }}>Date</Text>
            <Text style={{ color: colors.onSurface, fontWeight: '700' }}>Aug 15</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <MaterialIcons name="schedule" size={18} color={colors.primary} />
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11, marginTop: 6 }}>Time</Text>
            <Text style={{ color: colors.onSurface, fontWeight: '700' }}>08:30 AM</Text>
          </Card>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>About the Event</Text>
          <Text style={{ color: colors.onSurfaceVariant, lineHeight: 20, marginTop: 8 }}>
            Celebrate with your neighbors! We're hosting a community gathering with music, refreshments, and a
            flag-hoisting ceremony at Central Park. All residents and families welcome.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>Will you attend?</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceContainerLow }]}>
            {(['Attending', 'Maybe', 'Not Attending'] as Rsvp[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRsvp(r)}
                style={[styles.segment, rsvp === r && { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: rsvp === r ? '#FFFFFF' : colors.onSurfaceVariant, fontWeight: '700', fontSize: 12 }}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.guestRow}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Additional Guests</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepperButton, { borderColor: colors.outlineVariant }]}
                onPress={() => setGuests((g) => Math.max(0, g - 1))}
              >
                <MaterialIcons name="remove" size={18} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 16, width: 24, textAlign: 'center' }}>
                {guests}
              </Text>
              <TouchableOpacity
                style={[styles.stepperButton, { borderColor: colors.outlineVariant }]}
                onPress={() => setGuests((g) => Math.min(10, g + 1))}
              >
                <MaterialIcons name="add" size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: submitted ? colors.secondary : colors.primary }]}
            onPress={handleSubmit}
          >
            <MaterialIcons name={submitted ? 'check-circle' : 'check-circle-outline'} size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{submitted ? 'RSVP Confirmed' : 'Confirm RSVP'}</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  coverPlaceholder: { height: 180, borderRadius: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  infoGrid: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  segmentedControl: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submitButton: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
