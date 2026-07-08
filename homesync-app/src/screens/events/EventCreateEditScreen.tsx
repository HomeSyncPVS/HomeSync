import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'EventCreateEdit'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function EventCreateEditScreen() {
  const route = useRoute<Rt>();
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();

  const eventId = route.params?.eventId;
  const isEditMode = !!eventId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [capacity, setCapacity] = useState('');
  const [entryFee, setEntryFee] = useState('');

  useEffect(() => {
    if (isEditMode) {
      // Mock loading event values for edit
      setTitle('Independence Day Carnival');
      setDescription('Celebrate with food stalls, games, and cultural performances.');
      setDate('2026-08-15');
      setTime('08:30 AM');
      setDuration('6 Hours');
      setLocation('Central Lawn & Park');
      setPosterUrl('https://via.placeholder.com/600x300.png?text=Independence+Day+Carnival');
      setRsvpDeadline('2026-08-12');
      setCapacity('150');
      setEntryFee('150');
    }
  }, [eventId]);

  const isValid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    date.trim().length > 0 &&
    time.trim().length > 0 &&
    location.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    try {
      if (isEditMode) {
        // Simulated PUT /events/{id}
        await new Promise((resolve) => setTimeout(resolve, 500));
        Alert.alert('Success', 'Event updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Simulated POST /events/
        await new Promise((resolve) => setTimeout(resolve, 500));
        Alert.alert('Success', 'Event created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save event details.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isEditMode ? 'Edit Event' : 'Create Event'} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}>

        {/* Title details */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Event Title *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="e.g. Diwali celebration"
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={setTitle}
          />
        </Card>

        {/* Date and Time */}
        <Card style={styles.formCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Date *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.outline}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Start Time *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
                placeholder="e.g. 06:30 PM"
                placeholderTextColor={colors.outline}
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>
        </Card>

        {/* Location within flat */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Location *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="e.g. Clubhouse Ground Floor, Park"
            placeholderTextColor={colors.outline}
            value={location}
            onChangeText={setLocation}
          />
        </Card>

        {/* Entry fee and capacity limits */}
        <Card style={styles.formCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Entry Fee (₹)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
                placeholder="Free"
                placeholderTextColor={colors.outline}
                keyboardType="numeric"
                value={entryFee}
                onChangeText={setEntryFee}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Capacity Limit</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
                placeholder="Unlimited"
                placeholderTextColor={colors.outline}
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>
          </View>
        </Card>

        {/* Additional information */}
        <Card style={styles.formCard}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Duration</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
                placeholder="e.g. 3 Hours"
                placeholderTextColor={colors.outline}
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>RSVP Deadline</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.outline}
                value={rsvpDeadline}
                onChangeText={setRsvpDeadline}
              />
            </View>
          </View>
        </Card>

        {/* Poster Image URL */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Poster Image URL</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="https://example.com/banner.png"
            placeholderTextColor={colors.outline}
            value={posterUrl}
            onChangeText={setPosterUrl}
          />
        </Card>

        {/* Description detail */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Description Details *</Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="Describe the activities, programs, and guidelines..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={5}
            value={description}
            onChangeText={setDescription}
          />
        </Card>

      </ScrollView>

      {/* Trigger Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isValid ? colors.primary : colors.outlineVariant, borderRadius: radius.md }]}
          onPress={handleSubmit}
          disabled={!isValid}
        >
          <MaterialIcons name="done" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isEditMode ? 'Update Event' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    padding: 16,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
