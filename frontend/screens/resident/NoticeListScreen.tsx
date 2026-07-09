import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert } from 'react-native';
import { apiClient } from '../../utils/api';

interface Notice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  target_audience?: string;
}

interface NoticeListScreenProps {
  onNavigateToScreen: (screen: string, params?: any) => void;
  onGoBack: () => void;
}

export default function NoticeListScreen({
  onNavigateToScreen,
  onGoBack,
}: NoticeListScreenProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotices = async () => {
    try {
      // First retrieve own profile to get society_id
      const profileRes = await apiClient.get('/residents/me/profile');
      const societyId = profileRes.data.society_id;
      
      if (societyId) {
        const response = await apiClient.get(`/notices/?society_id=${societyId}`);
        setNotices(response.data);
      } else {
        Alert.alert('Notice Error', 'No society associated with your profile.');
      }
    } catch (err: any) {
      console.warn('Backend notices fetch failed:', err.message);
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to fetch notices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const renderItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onNavigateToScreen('NoticeDetails', { noticeId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.noticeDot} />
        <Text style={styles.dateText}>{item.created_at?.split('T')[0] || ''}</Text>
      </View>
      <Text style={styles.titleText}>{item.title}</Text>
      <Text style={styles.bodyPreviewText} numberOfLines={2}>
        {item.body}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.audienceText}>📢 {item.target_audience || 'All Residents'}</Text>
        <Text style={styles.readMoreText}>Read Details ❯</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Society Notices</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active notices at this time.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
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
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F6FED',
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  bodyPreviewText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  audienceText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  readMoreText: {
    fontSize: 11,
    color: '#2F6FED',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  badgeBanner: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
