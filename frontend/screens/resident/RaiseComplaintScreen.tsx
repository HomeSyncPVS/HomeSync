import React, { useState } from 'react';
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

interface RaiseComplaintScreenProps {
  onGoBack: () => void;
}

export default function RaiseComplaintScreen({ onGoBack }: RaiseComplaintScreenProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Maintenance'); // Maintenance, Security, Plumbing, Electrical, Others
  const [priority, setPriority] = useState('MEDIUM'); // LOW, MEDIUM, HIGH
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ['Maintenance', 'Security', 'Plumbing', 'Electrical', 'Others'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];

  const handleSubmit = async () => {
    if (!title.trim() || title.length < 3) {
      Alert.alert('Validation Error', 'Title must be at least 3 characters.');
      return;
    }
    if (!description.trim() || description.length < 10) {
      Alert.alert('Validation Error', 'Description must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      // Get society_id from own profile
      const profileRes = await apiClient.get('/residents/me/profile');
      const societyId = profileRes.data.society_id;

      if (!societyId) {
        Alert.alert('Error', 'You are not linked to any society.');
        setLoading(false);
        return;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category,
        priority: priority,
        location: location.trim() || null,
        society_id: societyId,
        attachment_urls: [],
      };

      const response = await apiClient.post('/complaints/', payload);
      const data = response.data;

      Alert.alert(
        'Complaint Raised',
        `Ticket #${data.complaint_number} created successfully with status: ${data.status}`,
        [{ text: 'OK', onPress: onGoBack }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit complaint. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raise Complaint</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  priority === p && styles.priorityButtonActive,
                  priority === p && p === 'HIGH' && { borderColor: '#E5484D', backgroundColor: '#FFECEF' },
                  priority === p && p === 'MEDIUM' && { borderColor: '#2F6FED', backgroundColor: '#EBF3FF' },
                  priority === p && p === 'LOW' && { borderColor: '#64748B', backgroundColor: '#F1F5F9' },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === p && { fontWeight: 'bold' },
                    priority === p && p === 'HIGH' && { color: '#E5484D' },
                    priority === p && p === 'MEDIUM' && { color: '#2F6FED' },
                    priority === p && p === 'LOW' && { color: '#64748B' },
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Complaint Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Lobby water leakage"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Min 10 characters)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue in detail..."
            multiline={true}
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location / Flat / Area (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Block B, 3rd floor hallway"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Complaint</Text>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    borderColor: '#2F6FED',
    backgroundColor: '#EBF3FF',
  },
  chipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#2F6FED',
    fontWeight: 'bold',
  },
  priorityRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  priorityButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F8FAFC',
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
