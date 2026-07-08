import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { StatusChip } from '../../components/StatusChip';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'ComplaintDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type ComplaintStatus = 'Open' | 'In Progress' | 'Closed';

interface ComplaintDetail {
  id: string;
  title: string;
  description: string;
  residentName: string;
  flatNumber: string;
  status: ComplaintStatus;
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  location: string;
  date: string;
}

export function ComplaintDetailScreen() {
  const route = useRoute<Rt>();
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // admin features allowed
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const getComplaintDetails = async (id: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Simulated GET /complaints/{id}
      setComplaint({
        id,
        title: 'Water Seepage in Bedroom Wall',
        description: 'Large damp patches have appeared on the east wall of the master bedroom, likely due to pipe leakage from the floor above. The paint is beginning to peel.',
        residentName: 'Amit Shah',
        flatNumber: 'A-703',
        status: 'Open',
        priority: 'High',
        category: 'Plumbing',
        location: 'Master Bedroom',
        date: 'Today, 11:30 AM',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve complaint details.');
    }
  };

  useEffect(() => {
    setLoading(true);
    getComplaintDetails(route.params.complaintId).then(() => setLoading(false));
  }, [route.params.complaintId]);

  const updateStatus = async (newStatus: ComplaintStatus) => {
    try {
      // Simulated PUT /complaints/{id} with body {status}
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (complaint) {
        setComplaint({ ...complaint, status: newStatus });
      }
      setShowDropdown(false);
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const closeComplaint = async () => {
    try {
      // Simulated POST /complaints/{id}/close
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (complaint) {
        setComplaint({ ...complaint, status: 'Closed' });
      }
      Alert.alert('Success', 'Complaint closed successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to close complaint.');
    }
  };

  const deleteComplaint = async () => {
    try {
      // Simulated DELETE /complaints/{id}
      await new Promise((resolve) => setTimeout(resolve, 400));
      Alert.alert('Deleted', 'Complaint deleted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete complaint.');
    }
  };

  const getStatusTone = (status: ComplaintStatus) => {
    if (status === 'Open') return 'warning';
    if (status === 'In Progress') return 'info';
    return 'success';
  };

  const getPriorityColor = (priority: 'Low' | 'Medium' | 'High') => {
    if (priority === 'High') return colors.error;
    if (priority === 'Medium') return colors.primary;
    return colors.onSurfaceVariant;
  };

  if (loading || !complaint) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Complaint Details" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 60 }}>
        
        {/* Core details card */}
        <Card style={styles.detailCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleArea}>
              <Text style={[styles.title, { color: colors.onSurface }]}>{complaint.title}</Text>
              <Text style={[styles.metaText, { color: colors.onSurfaceVariant, marginTop: 4 }]}>
                {complaint.category} · {complaint.date}
              </Text>
            </View>
            <StatusChip label={complaint.status} tone={getStatusTone(complaint.status)} />
          </View>

          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            {complaint.description}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          {/* Properties grid */}
          <View style={styles.propsGrid}>
            <View style={styles.propItem}>
              <Text style={[styles.propLabel, { color: colors.outline }]}>Reporter</Text>
              <Text style={[styles.propVal, { color: colors.onSurface }]}>
                {complaint.residentName} ({complaint.flatNumber})
              </Text>
            </View>
            <View style={styles.propItem}>
              <Text style={[styles.propLabel, { color: colors.outline }]}>Location</Text>
              <Text style={[styles.propVal, { color: colors.onSurface }]}>{complaint.location}</Text>
            </View>
            <View style={styles.propItem}>
              <Text style={[styles.propLabel, { color: colors.outline }]}>Priority</Text>
              <View style={styles.priorityRow}>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(complaint.priority) }]} />
                <Text style={[styles.propVal, { color: colors.onSurface }]}>{complaint.priority}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Status timeline mock */}
        <Card style={styles.timelineCard}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Progress Tracker</Text>
          <View style={styles.timelineRow}>
            <View style={styles.timelineTrackCol}>
              <View style={[styles.trackDot, { backgroundColor: colors.secondary }]} />
              <View style={[styles.trackLine, { backgroundColor: complaint.status !== 'Open' ? colors.secondary : colors.outlineVariant }]} />
            </View>
            <View style={styles.trackDetails}>
              <Text style={[styles.trackLabel, { color: colors.onSurface }]}>Raised</Text>
              <Text style={[styles.trackTime, { color: colors.outline }]}>{complaint.date}</Text>
            </View>
          </View>

          <View style={styles.timelineRow}>
            <View style={styles.timelineTrackCol}>
              <View style={[styles.trackDot, { backgroundColor: complaint.status !== 'Open' ? colors.primary : colors.surfaceContainerHigh }]} />
              <View style={[styles.trackLine, { backgroundColor: complaint.status === 'Closed' ? colors.secondary : colors.outlineVariant }]} />
            </View>
            <View style={styles.trackDetails}>
              <Text style={[styles.trackLabel, { color: colors.onSurface }]}>In Progress</Text>
              <Text style={[styles.trackTime, { color: colors.outline }]}>
                {complaint.status !== 'Open' ? 'Under technical review' : 'Awaiting assignment'}
              </Text>
            </View>
          </View>

          <View style={styles.timelineRow}>
            <View style={styles.timelineTrackCol}>
              <View style={[styles.trackDot, { backgroundColor: complaint.status === 'Closed' ? colors.secondary : colors.surfaceContainerHigh }]} />
            </View>
            <View style={styles.trackDetails}>
              <Text style={[styles.trackLabel, { color: colors.onSurface }]}>Closed</Text>
              <Text style={[styles.trackTime, { color: colors.outline }]}>
                {complaint.status === 'Closed' ? 'Resolved successfully' : 'Pending resolution'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Admin interactive controls */}
        {isAdmin && (
          <Card style={styles.adminCard}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>Admin Actions</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownSelector, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={{ color: colors.onSurface, fontWeight: '600' }}>Update Status: {complaint.status}</Text>
                <MaterialIcons name={showDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={colors.onSurface} />
              </TouchableOpacity>
              {showDropdown && (
                <View style={[styles.dropdownOptions, { borderColor: colors.outlineVariant, backgroundColor: colors.surface, borderRadius: radius.md }]}>
                  {(['Open', 'In Progress', 'Closed'] as ComplaintStatus[]).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.dropdownOpt, { borderBottomColor: colors.outlineVariant }]}
                      onPress={() => updateStatus(st)}
                    >
                      <Text style={{ color: colors.onSurface, fontWeight: '500' }}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Bottom utility actions */}
        <View style={styles.actionsRow}>
          {complaint.status !== 'Closed' && (
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.secondary, borderRadius: radius.md }]}
              onPress={closeComplaint}
            >
              <MaterialIcons name="done" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Close Ticket</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: colors.error, borderRadius: radius.md }]}
            onPress={deleteComplaint}
          >
            <MaterialIcons name="delete-outline" size={18} color={colors.error} />
            <Text style={[styles.buttonText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '800',
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  propsGrid: {
    gap: 12,
  },
  propItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  propVal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineCard: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timelineTrackCol: {
    alignItems: 'center',
  },
  trackDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  trackLine: {
    width: 2,
    height: 32,
    marginVertical: 2,
  },
  trackDetails: {
    flex: 1,
  },
  trackLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  trackTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  adminCard: {
    padding: 16,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    zIndex: 20,
    overflow: 'hidden',
  },
  dropdownOpt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  closeButton: {
    flex: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
