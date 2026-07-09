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

interface CreateNoticeScreenProps {
  route: {
    params: {
      noticeId?: string;
    };
  };
  onGoBack: () => void;
}

export default function CreateNoticeScreen({
  route,
  onGoBack,
}: CreateNoticeScreenProps) {
  const { noticeId } = route.params || {};
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noticeType, setNoticeType] = useState('General');
  const [targetGroup, setTargetGroup] = useState('All');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (noticeId) {
      fetchNoticeDetails();
    }
  }, [noticeId]);

  const fetchNoticeDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/notices/${noticeId}`);
      const data = response.data;
      setTitle(data.title);
      setContent(data.content);
      setNoticeType(data.notice_type || 'General');
      setTargetGroup(data.target_group || 'All');
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve notice details.');
      onGoBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || title.length < 3) {
      Alert.alert('Validation Error', 'Title must be at least 3 characters.');
      return;
    }
    if (!content.trim() || content.length < 10) {
      Alert.alert('Validation Error', 'Content must be at least 10 characters.');
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

      const payload = {
        title: title.trim(),
        content: content.trim(),
        notice_type: noticeType,
        target_group: targetGroup,
        society_id: societyId,
      };

      if (noticeId) {
        await apiClient.put(`/notices/${noticeId}`, payload);
      } else {
        await apiClient.post('/notices/', payload);
      }

      Alert.alert('Success', 'Notice saved successfully.');
      onGoBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save notice.');
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
        <Text style={styles.headerTitle}>{noticeId ? 'Edit Notice' : 'New Notice'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notice Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Schedule for Painting"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type of Notice</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. General, Maintenance, Event"
            value={noticeType}
            onChangeText={setNoticeType}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Target Group (Audience)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. All, Wing A, Building 2"
            value={targetGroup}
            onChangeText={setTargetGroup}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notice Content (Min 10 characters)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write the full notice detail here..."
            multiline={true}
            numberOfLines={6}
            value={content}
            onChangeText={setContent}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{noticeId ? 'Update Notice' : 'Publish Notice'}</Text>
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
  textArea: {
    height: 140,
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
