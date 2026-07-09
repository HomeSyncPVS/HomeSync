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
  Alert,
  Modal,
  TextInput,
  ScrollView } from 'react-native';
import { apiClient } from '../../utils/api';

interface Complaint {
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
}

interface MyComplaintsScreenProps {
  onGoBack: () => void;
  onNavigateToScreen: (screen: string, params?: any) => void;
}

export default function MyComplaintsScreen({
  onGoBack,
  onNavigateToScreen,
}: MyComplaintsScreenProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal & Edit states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMyComplaints = async () => {
    try {
      setErrorMessage(null);
      // Fetch profile to get society_id
      const profileRes = await apiClient.get('/residents/me/profile');
      const societyId = profileRes.data.society_id;
      
      if (societyId) {
        // Residents only see their own due to server-side user_id filtering automatically
        const response = await apiClient.get(`/complaints/?society_id=${societyId}`);
        setComplaints(response.data);
      } else {
        setErrorMessage('You are not associated with a society.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to fetch complaints. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyComplaints();
  };

  const handleOpenDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setEditTitle(complaint.title);
    setEditDesc(complaint.description);
    setEditCategory(complaint.category);
    setEditLocation(complaint.location || '');
    setEditMode(false);
    setDetailModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedComplaint) return;
    if (!editTitle.trim() || editTitle.length < 3) {
      Alert.alert('Validation Error', 'Title must be at least 3 characters.');
      return;
    }
    if (!editDesc.trim() || editDesc.length < 10) {
      Alert.alert('Validation Error', 'Description must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.put(`/complaints/${selectedComplaint.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        location: editLocation.trim() || null,
      });

      const updated = response.data;
      setSelectedComplaint(updated);
      setEditMode(false);
      fetchMyComplaints();
      Alert.alert('Success', 'Complaint updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseComplaint = async () => {
    if (!selectedComplaint) return;
    Alert.alert(
      'Confirm Close',
      'Are you sure you want to close this complaint ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Ticket',
          onPress: async () => {
            setSubmitting(true);
            try {
              const response = await apiClient.post(`/complaints/${selectedComplaint.id}/close`);
              setSelectedComplaint(response.data);
              fetchMyComplaints();
              Alert.alert('Ticket Closed', 'The complaint ticket has been closed.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to close complaint.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteComplaint = async () => {
    if (!selectedComplaint) return;
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this complaint? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiClient.delete(`/complaints/${selectedComplaint.id}`);
              setDetailModalVisible(false);
              fetchMyComplaints();
              Alert.alert('Ticket Deleted', 'The complaint ticket has been deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to delete complaint.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
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

  const renderItem = ({ item }: { item: Complaint }) => {
    const colors = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenDetail(item)}
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
          <Text style={styles.categoryText}>📁 {item.category}</Text>
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
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onNavigateToScreen('RaiseComplaint')}
        >
          <Text style={styles.addButtonText}>Raise</Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2F6FED']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't filed any complaints yet.</Text>
            </View>
          }
        />
      )}

      {/* Detail & Edit Modal */}
      {selectedComplaint && (
        <Modal animationType="slide" transparent={true} visible={detailModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editMode ? 'Edit Complaint' : `Ticket #${selectedComplaint.complaint_number}`}
                </Text>
                {!editMode && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedComplaint.status).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedComplaint.status).text }]}>
                      {selectedComplaint.status}
                    </Text>
                  </View>
                )}
              </View>

              <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                {editMode ? (
                  <View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Category</Text>
                      <TextInput
                        style={styles.input}
                        value={editCategory}
                        onChangeText={setEditCategory}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Title</Text>
                      <TextInput
                        style={styles.input}
                        value={editTitle}
                        onChangeText={setEditTitle}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline={true}
                        numberOfLines={4}
                        value={editDesc}
                        onChangeText={setEditDesc}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Location</Text>
                      <TextInput
                        style={styles.input}
                        value={editLocation}
                        onChangeText={setEditLocation}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailBody}>
                    <Text style={styles.detailTitle}>{selectedComplaint.title}</Text>
                    <Text style={styles.detailCategory}>Category: {selectedComplaint.category} • Priority: {selectedComplaint.priority}</Text>
                    
                    {selectedComplaint.location && (
                      <Text style={styles.detailLocation}>📍 Location: {selectedComplaint.location}</Text>
                    )}

                    <Text style={styles.detailDescLabel}>Description</Text>
                    <Text style={styles.detailDesc}>{selectedComplaint.description}</Text>

                    {selectedComplaint.estimated_resolution_date && (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Estimated Resolution Date</Text>
                        <Text style={styles.infoValue}>
                          {new Date(selectedComplaint.estimated_resolution_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalButtons}>
                {editMode ? (
                  <>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setEditMode(false)}
                      disabled={submitting}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton]}
                      onPress={handleSaveEdit}
                      disabled={submitting}
                    >
                      {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setDetailModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Close View</Text>
                    </TouchableOpacity>

                    {selectedComplaint.status === 'OPEN' && (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.editActionButton]}
                        onPress={() => setEditMode(true)}
                      >
                        <Text style={styles.editActionText}>Edit</Text>
                      </TouchableOpacity>
                    )}

                    {selectedComplaint.status !== 'CLOSED' && selectedComplaint.status !== 'RESOLVED' && (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.closeActionButton]}
                        onPress={handleCloseComplaint}
                      >
                        <Text style={styles.closeActionText}>Close Ticket</Text>
                      </TouchableOpacity>
                    )}

                    {selectedComplaint.status === 'OPEN' && (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.deleteActionButton]}
                        onPress={handleDeleteComplaint}
                      >
                        <Text style={styles.deleteActionText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
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
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2F6FED',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFECEF',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
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
  detailBody: {
    paddingVertical: 8,
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
    marginBottom: 12,
  },
  detailLocation: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
  },
  detailDescLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  detailDesc: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#B45309',
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    flex: 1,
    marginHorizontal: 3,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34B37A',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editActionButton: {
    backgroundColor: '#2F6FED',
  },
  editActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  closeActionButton: {
    backgroundColor: '#64748B',
  },
  closeActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  deleteActionButton: {
    backgroundColor: '#E5484D',
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
