import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
  TextInput } from 'react-native';
import { apiClient } from '../../utils/api';

interface ComplaintDetails {
  id: string;
  complaint_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location?: string;
  created_at: string;
  estimated_resolution_date?: string;
  resolved_at?: string;
  user_id: string;
}

interface AdminComplaintDetailsScreenProps {
  route: {
    params: {
      complaintId: string;
    };
  };
  onGoBack: () => void;
}

export default function AdminComplaintDetailsScreen({
  route,
  onGoBack,
}: AdminComplaintDetailsScreenProps) {
  const { complaintId } = route.params || {};
  const [complaint, setComplaint] = useState<ComplaintDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit fields
  const [status, setStatus] = useState('OPEN');
  const [estDate, setEstDate] = useState('');

  const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

  const fetchComplaintDetails = async () => {
    try {
      const userRes = await apiClient.get('/auth/me');
      const role = userRes.data.role?.name;
      setIsAdmin(role === 'Super Admin' || role === 'Society Admin' || role === 'Committee Member');

      const response = await apiClient.get(`/complaints/${complaintId}`);
      const data = response.data;
      setComplaint(data);
      setStatus(data.status);
      if (data.estimated_resolution_date) {
        setEstDate(data.estimated_resolution_date.split('T')[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve complaint details.');
      onGoBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [complaintId]);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const payload: any = { status };
      if (estDate.trim()) {
        payload.estimated_resolution_date = new Date(estDate).toISOString();
      }

      const response = await apiClient.put(`/complaints/${complaintId}`, payload);
      setComplaint(response.data);
      Alert.alert('Success', 'Complaint status updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Error', err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCloseComplaint = async () => {
    Alert.alert(
      'Confirm Close',
      'Are you sure you want to close this ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Ticket',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await apiClient.post(`/complaints/${complaintId}/close`);
              setComplaint(response.data);
              setStatus(response.data.status);
              Alert.alert('Ticket Closed', 'The complaint ticket has been closed.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to close complaint.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  if (!complaint) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Ticket #{complaint.complaint_number}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.detailTitle}>{complaint.title}</Text>
          <Text style={styles.detailCategory}>
            📁 {complaint.category} • Priority: {complaint.priority}
          </Text>

          {complaint.location && (
            <Text style={styles.detailLocation}>📍 Location: {complaint.location}</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{complaint.description}</Text>

          <Text style={styles.dateText}>Raised on: {new Date(complaint.created_at).toLocaleString()}</Text>
        </View>

        {isAdmin && complaint.status !== 'CLOSED' && (
          <View style={styles.adminControlBox}>
            <Text style={styles.adminBoxTitle}>🛠️ Admin Actions</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Update Status</Text>
              <View style={styles.radioGroup}>
                {statuses.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.radioButton, status === s && styles.radioActive]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[styles.radioText, status === s && styles.radioActiveText]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estimated Resolution Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-07-20"
                value={estDate}
                onChangeText={setEstDate}
              />
            </View>

            <TouchableOpacity style={styles.updateButton} onPress={handleUpdateStatus} disabled={updating}>
              {updating ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.updateButtonText}>Apply Changes</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={handleCloseComplaint} disabled={updating}>
              <Text style={styles.closeButtonText}>Close Ticket Permanent</Text>
            </TouchableOpacity>
          </View>
        )}

        {complaint.status === 'CLOSED' && (
          <View style={styles.resolvedInfoBox}>
            <Text style={styles.resolvedTitle}>✅ Closed Ticket</Text>
            <Text style={styles.resolvedDesc}>This ticket has been marked resolved and closed.</Text>
          </View>
        )}
      </ScrollView>
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
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  detailCategory: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  detailLocation: {
    fontSize: 13,
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  adminControlBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  adminBoxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC',
  },
  radioActive: {
    borderColor: '#2F6FED',
    backgroundColor: '#EBF3FF',
  },
  radioText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  radioActiveText: {
    color: '#2F6FED',
    fontWeight: 'bold',
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
  updateButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeButton: {
    backgroundColor: '#FFECEF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD0D4',
  },
  closeButtonText: {
    color: '#E5484D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  resolvedInfoBox: {
    backgroundColor: '#E8FDF3',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  resolvedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34B37A',
  },
  resolvedDesc: {
    fontSize: 13,
    color: '#047857',
    marginTop: 4,
    textAlign: 'center',
  },
});
