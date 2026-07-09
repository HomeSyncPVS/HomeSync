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

interface Resident {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  approval_status: string;
  flat?: {
    number: string;
    floor?: {
      wing?: {
        name: string;
      };
    };
  };
}

interface ResidentApprovalsScreenProps {
  onGoBack: () => void;
}

export default function ResidentApprovalsScreen({
  onGoBack,
}: ResidentApprovalsScreenProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingResidents = async () => {
    try {
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;

      if (societyId) {
        // Fetch residents filtering by PENDING status
        const response = await apiClient.get(`/residents?society_id=${societyId}&approval_status=PENDING`);
        setResidents(response.data);
      }
    } catch (err) {
      console.error('Failed to load pending approvals', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingResidents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingResidents();
  };

  const handleApproveReject = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setLoading(true);
    try {
      await apiClient.put(`/residents/${id}/approve`, { status });
      Alert.alert('Status Updated', `Resident registration has been ${status.toLowerCase()}.`);
      fetchPendingResidents();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update approval status.');
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Resident }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nameText}>{item.full_name}</Text>
        <Text style={styles.contactText}>✉️ {item.email}</Text>
        {item.phone && <Text style={styles.contactText}>📞 {item.phone}</Text>}
        <Text style={styles.flatText}>
          Requested Flat: {item.flat?.floor?.wing?.name || ''}-{item.flat?.number || 'Unassigned'}
        </Text>
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApproveReject(item.id, 'APPROVED')}
        >
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleApproveReject(item.id, 'REJECTED')}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
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
        <Text style={styles.headerTitle}>Approvals</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending resident requests.</Text>
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
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  flatText: {
    fontSize: 13,
    color: '#2F6FED',
    fontWeight: '600',
    marginTop: 8,
  },
  actionColumn: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#34B37A',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rejectButton: {
    backgroundColor: '#FFECEF',
    borderWidth: 1,
    borderColor: '#FFD0D4',
  },
  rejectButtonText: {
    color: '#E5484D',
    fontWeight: 'bold',
    fontSize: 12,
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
