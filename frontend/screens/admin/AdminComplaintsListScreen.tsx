import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl } from 'react-native';
import { apiClient } from '../../utils/api';

interface Complaint {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

interface AdminComplaintsListScreenProps {
  onNavigateToScreen: (screen: string, params?: any) => void;
  onGoBack: () => void;
}

export default function AdminComplaintsListScreen({
  onNavigateToScreen,
  onGoBack,
}: AdminComplaintsListScreenProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null); // null means 'All'

  const statuses = ['All', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

  const fetchComplaints = async () => {
    try {
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;

      if (societyId) {
        const response = await apiClient.get(`/complaints/?society_id=${societyId}`);
        setComplaints(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: '#EBF3FF', text: '#2F6FED' };
      case 'IN_PROGRESS':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'RESOLVED':
        return { bg: '#E8FDF3', text: '#34B37A' };
      case 'CLOSED':
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const filteredComplaints = filterStatus && filterStatus !== 'All'
    ? complaints.filter((c) => c.status === filterStatus)
    : complaints;

  const renderItem = ({ item }: { item: Complaint }) => {
    const colors = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onNavigateToScreen('AdminComplaintDetails', { complaintId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.ticketNum}>#{item.complaint_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusBadgeText, { color: colors.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.titleText}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.categoryText}>📁 {item.category} • Priority: {item.priority}</Text>
          <Text style={styles.dateText}>{item.created_at?.split('T')[0]}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Complaints</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal={true}
          data={statuses}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                (filterStatus === item || (item === 'All' && filterStatus === null)) && styles.filterTabActive,
              ]}
              onPress={() => setFilterStatus(item === 'All' ? null : item)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  (filterStatus === item || (item === 'All' && filterStatus === null)) && styles.filterTabTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No complaints match this status.</Text>
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#2F6FED',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
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
  categoryText: {
    fontSize: 12,
    color: '#64748B',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
