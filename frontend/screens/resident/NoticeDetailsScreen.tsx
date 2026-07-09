import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Alert } from 'react-native';
import { apiClient } from '../../utils/api';

interface Notice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  target_audience?: string;
  author?: string;
}

interface NoticeDetailsScreenProps {
  route: {
    params: {
      noticeId: string;
    };
  };
  onGoBack: () => void;
}

export default function NoticeDetailsScreen({
  route,
  onGoBack,
}: NoticeDetailsScreenProps) {
  const { noticeId } = route.params || {};
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNoticeDetails = async () => {
      try {
        const response = await apiClient.get(`/notices/${noticeId}`);
        setNotice(response.data);
      } catch (err: any) {
        console.warn('Backend fetch failed:', err.message);
        Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to retrieve notice details.');
        onGoBack();
      } finally {
        setLoading(false);
      }
    };

    fetchNoticeDetails();
  }, [noticeId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  if (!notice) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Notice not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notice Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notice Meta Box */}
        <View style={styles.metaContainer}>
          <View style={styles.audienceBadge}>
            <Text style={styles.audienceText}>📢 {notice.target_audience || 'All Residents'}</Text>
          </View>
          <Text style={styles.dateText}>Published on: {notice.created_at?.split('T')[0]}</Text>
        </View>

        <Text style={styles.titleText}>{notice.title}</Text>
        
        <View style={styles.divider} />

        <Text style={styles.bodyText}>{notice.body}</Text>

        <View style={styles.footerInfo}>
          <Text style={styles.authorLabel}>Issued By</Text>
          <Text style={styles.authorValue}>{notice.author || 'Society Committee / Management'}</Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#E5484D',
  },
  scrollContent: {
    padding: 24,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  audienceBadge: {
    backgroundColor: '#EBF3FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  audienceText: {
    fontSize: 12,
    color: '#2F6FED',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  bodyText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 40,
  },
  footerInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  authorLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  authorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
});
