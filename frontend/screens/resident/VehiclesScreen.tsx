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

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  make_model?: string;
  parking_slot?: string;
}

interface VehiclesScreenProps {
  onGoBack: () => void;
}

export default function VehiclesScreen({ onGoBack }: VehiclesScreenProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('FOUR_WHEELER'); // TWO_WHEELER or FOUR_WHEELER
  const [makeModel, setMakeModel] = useState('');
  const [parkingSlot, setParkingSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/residents/me/vehicles');
      setVehicles(response.data);
    } catch (err: any) {
      console.warn('Backend fetch failed:', err.message);
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to fetch vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setVehicleNumber('');
    setVehicleType('FOUR_WHEELER');
    setMakeModel('');
    setParkingSlot('');
    setModalVisible(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setVehicleNumber(vehicle.vehicle_number);
    setVehicleType(vehicle.vehicle_type);
    setMakeModel(vehicle.make_model || '');
    setParkingSlot(vehicle.parking_slot || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Validation Error', 'Vehicle Number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: vehicleType,
      };
      if (makeModel.trim()) payload.make_model = makeModel.trim();
      if (parkingSlot.trim()) payload.parking_slot = parkingSlot.trim();

      if (editingId) {
        await apiClient.put(`/residents/me/vehicles/${editingId}`, payload);
      } else {
        await apiClient.post('/residents/me/vehicles', payload);
      }
      setModalVisible(false);
      fetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.delete(`/residents/me/vehicles/${id}`);
              fetchVehicles();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || err.message || 'Delete failed.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={styles.vehicleHeader}>
          <Text style={styles.vehicleNum}>{item.vehicle_number}</Text>
          <View style={[styles.typeBadge, { backgroundColor: item.vehicle_type === 'FOUR_WHEELER' ? '#EBF3FF' : '#E8FDF3' }]}>
            <Text style={[styles.typeBadgeText, { color: item.vehicle_type === 'FOUR_WHEELER' ? '#2F6FED' : '#34B37A' }]}>
              {item.vehicle_type === 'FOUR_WHEELER' ? '🚗 Car' : '🏍️ Bike'}
            </Text>
          </View>
        </View>
        {item.make_model && <Text style={styles.vehicleModel}>{item.make_model}</Text>}
        <Text style={styles.vehicleParking}>🅿️ Parking Slot: {item.parking_slot || 'Unassigned'}</Text>
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
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No vehicles added yet.</Text>
            </View>
          }
        />
      )}

      {/* FAB to Add Vehicle */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Vehicle' : 'Register Vehicle'}</Text>
            <ScrollView style={{ width: '100%' }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MH12AB1234"
                  autoCapitalize="characters"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Type</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioButton, vehicleType === 'FOUR_WHEELER' && styles.radioActive]}
                    onPress={() => setVehicleType('FOUR_WHEELER')}
                  >
                    <Text style={[styles.radioText, vehicleType === 'FOUR_WHEELER' && styles.radioActiveText]}>🚗 Four Wheeler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, vehicleType === 'TWO_WHEELER' && styles.radioActive]}
                    onPress={() => setVehicleType('TWO_WHEELER')}
                  >
                    <Text style={[styles.radioText, vehicleType === 'TWO_WHEELER' && styles.radioActiveText]}>🏍️ Two Wheeler</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Make & Model (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Honda City"
                  value={makeModel}
                  onChangeText={setMakeModel}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Parking Slot (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. P-102"
                  autoCapitalize="characters"
                  value={parkingSlot}
                  onChangeText={setParkingSlot}
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
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vehicleNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginRight: 8,
  },
  typeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  vehicleModel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  vehicleParking: {
    fontSize: 12,
    color: '#94A3B8',
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
    marginHorizontal: 4,
    backgroundColor: '#F8FAFC',
  },
  radioActive: {
    borderColor: '#2F6FED',
    backgroundColor: '#EBF3FF',
  },
  radioText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  radioActiveText: {
    color: '#2F6FED',
    fontWeight: 'bold',
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
