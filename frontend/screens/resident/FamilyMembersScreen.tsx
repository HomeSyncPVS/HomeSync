import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Alert } from 'react-native';
import { apiClient } from '../../utils/api';

interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  phone?: string;
  email?: string;
}

interface FamilyMembersScreenProps {
  onGoBack: () => void;
}

export default function FamilyMembersScreen({ onGoBack }: FamilyMembersScreenProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/residents/me/family');
      setMembers(response.data);
    } catch (err: any) {
      console.warn('Backend fetch failed:', err.message);
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to fetch family members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setRelationship('');
    setPhone('');
    setEmail('');
    setModalVisible(true);
  };

  const handleOpenEdit = (member: FamilyMember) => {
    setEditingId(member.id);
    setName(member.full_name);
    setRelationship(member.relationship);
    setPhone(member.phone || '');
    setEmail(member.email || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !relationship.trim()) {
      Alert.alert('Validation Error', 'Name and Relationship are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        full_name: name.trim(),
        relationship: relationship.trim(),
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();

      if (editingId) {
        await apiClient.put(`/residents/me/family/${editingId}`, payload);
      } else {
        await apiClient.post('/residents/me/family', payload);
      }
      setModalVisible(false);
      fetchFamilyMembers();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.delete(`/residents/me/family/${id}`);
              fetchFamilyMembers();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || err.message || 'Delete failed.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FamilyMember }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{item.full_name}</Text>
        <Text style={styles.memberRelation}>{item.relationship}</Text>
        {item.phone && <Text style={styles.memberContact}>📞 {item.phone}</Text>}
        {item.email && <Text style={styles.memberContact}>✉️ {item.email}</Text>}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleOpenEdit(item)}>
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
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Members</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No family members added yet.</Text>
            </View>
          }
        />
      )}

      {/* FAB to Add Member */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Member' : 'Add Family Member'}</Text>
            <ScrollView style={{ width: '100%' }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Emma Watson"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relationship</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Spouse, Son, Mother"
                  value={relationship}
                  onChangeText={setRelationship}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+15550192834"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="emma@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  memberRelation: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  memberContact: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  actionButtons: {
    flexDirection: 'row',
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
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
  modalButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2F6FED',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
