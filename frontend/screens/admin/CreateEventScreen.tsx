import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert } from 'react-native';
import { apiClient } from '../../utils/api';

interface CreateEventScreenProps {
  route: {
    params: {
      eventId?: string;
    };
  };
  onGoBack: () => void;
}

export default function CreateEventScreen({
  route,
  onGoBack,
}: CreateEventScreenProps) {
  const { eventId } = route.params || {};
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [capacity, setCapacity] = useState('');
  const [fee, setFee] = useState('0.0');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      const data = response.data;
      setName(data.name);
      setDescription(data.description);
      setDateTime(data.date_time ? data.date_time.replace('T', ' ').substring(0, 16) : '');
      setDuration(data.duration_minutes?.toString() || '60');
      setLocation(data.location);
      setDeadline(data.rsvp_deadline ? data.rsvp_deadline.replace('T', ' ').substring(0, 16) : '');
      setCapacity(data.capacity?.toString() || '');
      setFee(data.entry_fee?.toString() || '0.0');
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve event details.');
      onGoBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !dateTime.trim() || !location.trim() || !deadline.trim()) {
      Alert.alert('Validation Error', 'All main fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;

      if (!societyId) {
        Alert.alert('Error', 'You are not linked to a society.');
        setSubmitting(false);
        return;
      }

      // Format dates into ISO Strings
      const eventDateISO = new Date(dateTime.replace(' ', 'T')).toISOString();
      const deadlineDateISO = new Date(deadline.replace(' ', 'T')).toISOString();

      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        date_time: eventDateISO,
        duration_minutes: parseInt(duration) || 60,
        location: location.trim(),
        rsvp_deadline: deadlineDateISO,
        entry_fee: parseFloat(fee) || 0.0,
        society_id: societyId,
      };

      if (capacity.trim()) {
        payload.capacity = parseInt(capacity);
      }

      if (eventId) {
        await apiClient.put(`/events/${eventId}`, payload);
      } else {
        await apiClient.post('/events/', payload);
      }

      Alert.alert('Success', 'Event saved successfully.');
      onGoBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{eventId ? 'Edit Event' : 'New Event'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Independence Day Celebration"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location / Venue</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Clubhouse / Society Garden"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Date & Time (YYYY-MM-DD HH:MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-08-15 18:00"
            value={dateTime}
            onChangeText={setDateTime}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>RSVP Deadline (YYYY-MM-DD HH:MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-08-14 12:00"
            value={deadline}
            onChangeText={setDeadline}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Duration (Min)</Text>
            <TextInput
              style={styles.input}
              placeholder="60"
              keyboardType="number-pad"
              value={duration}
              onChangeText={setDuration}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Capacity (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100"
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Entry Fee ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            keyboardType="numeric"
            value={fee}
            onChangeText={setFee}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Min 10 characters)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detail event activities, agendas, guidelines..."
            multiline={true}
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{eventId ? 'Update Event' : 'Publish Event'}</Text>
          )}
        </TouchableOpacity>
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
    color: '#E5484D',
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
  scrollContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1E293B',
  },
  row: {
    flexDirection: 'row',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
