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
  expiry_date?: string;
}

interface NoticeManagementScreenProps {
  onNavigateToScreen: (screen: string, params?: any) => void;
  onGoBack: () => void;
}

export default function NoticeManagementScreen({
  onNavigateToScreen,
  onGoBack,
}: NoticeManagementScreenProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotices = async () => {
    try {
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;
      
      if (societyId) {
        // Fetch notice archive (all notices, drafts/published/expired)
        const response = await apiClient.get(`/notices/archive?society_id=${societyId}`);
        setNotices(response.data);
      }
    } catch (err) {
      console.error('Failed to load notices', err);
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

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this notice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.delete(`/notices/${id}`);
              fetchNotices();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Delete failed.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Notice }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.dateText}>{item.created_at?.split('T')[0]}</Text>
        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.audienceText}>Audience: {item.target_audience || 'All Residents'}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onNavigateToScreen('CreateNotice', { noticeId: item.id })}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Notices</Text>
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
              <Text style={styles.emptyText}>No notices published yet.</Text>
            </View>
          }
        />
      )}

      {/* FAB to Create Notice */}
      <TouchableOpacity style={styles.fab} onPress={() => onNavigateToScreen('CreateNotice')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 8,
  },
  audienceText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  editButton: {
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 6,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FFECEF',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2F6FED',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
});
