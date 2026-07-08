import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

interface PendingResident {
  id: string;
  fullName: string;
  phone: string;
  flatNumber: string;
  submittedDate: string;
  idProofUrl?: string;
  role: string;
}

export function ResidentApprovalsScreen() {
  const { colors, spacing, radius } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingResidents, setPendingResidents] = useState<PendingResident[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Mock API mapping: list endpoint -> GET /residents?approval_status=PENDING
  const fetchPendingResidents = async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      setPendingResidents([
        {
          id: 'res-101',
          fullName: 'Aman Gupta',
          phone: '+91 98765 43210',
          flatNumber: 'Wing B - 402',
          submittedDate: 'Jul 08, 2026',
          idProofUrl: 'https://via.placeholder.com/600x400.png?text=Aadhar+Card+Aman+Gupta',
          role: 'Resident (Owner)',
        },
        {
          id: 'res-102',
          fullName: 'Sana Khan',
          phone: '+91 99988 87766',
          flatNumber: 'Wing C - 105',
          submittedDate: 'Jul 07, 2026',
          idProofUrl: 'https://via.placeholder.com/600x400.png?text=Rent+Agreement+Sana+Khan',
          role: 'Resident (Tenant)',
        },
        {
          id: 'res-103',
          fullName: 'Vikram Malhotra',
          phone: '+91 98123 45678',
          flatNumber: 'Wing A - 1203',
          submittedDate: 'Jul 05, 2026',
          idProofUrl: 'https://via.placeholder.com/600x400.png?text=Aadhar+Card+Vikram+M',
          role: 'Resident (Owner)',
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve approval list.');
    }
  };

  // Mock API mapping: action endpoint -> PUT /residents/{resident_id}/approve
  const handleApprovalAction = async (residentId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      // Simulate API update request
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Remove the processed resident from the local state list
      setPendingResidents((prev) => prev.filter((r) => r.id !== residentId));
      if (expandedId === residentId) {
        setExpandedId(null);
      }

      Alert.alert(
        'Success',
        `Resident request has been successfully ${action.toLowerCase()}.`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to perform ${action.toLowerCase()} action.`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingResidents();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchPendingResidents().then(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Resident Approvals" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.screenHeader}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Pending Approvals</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Review and approve registration requests to join the society
          </Text>
        </View>

        {pendingResidents.length === 0 ? (
          /* Empty State strictly matching the design requirements */
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.secondary + '1A' }]}>
              <MaterialIcons name="done-all" size={32} color={colors.secondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>All Caught Up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              No pending resident registration approvals at the moment.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {pendingResidents.map((resident) => {
              const isExpanded = expandedId === resident.id;
              return (
                <TouchableOpacity
                  key={resident.id}
                  activeOpacity={0.9}
                  onPress={() => toggleExpand(resident.id)}
                >
                  <Card style={StyleSheet.flatten([styles.residentCard, isExpanded && { borderColor: colors.primary, borderWidth: 1 }])}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.avatar, { backgroundColor: colors.surfaceContainerLow }]}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>
                          {resident.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.residentName, { color: colors.onSurface }]}>
                          {resident.fullName}
                        </Text>
                        <Text style={[styles.residentDetails, { color: colors.onSurfaceVariant }]}>
                          {resident.flatNumber} · {resident.role}
                        </Text>
                      </View>
                      <MaterialIcons
                        name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={24}
                        color={colors.onSurfaceVariant}
                      />
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="phone" size={14} color={colors.outline} />
                        <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{resident.phone}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="event" size={14} color={colors.outline} />
                        <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{resident.submittedDate}</Text>
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={[styles.expandedContent, { borderTopColor: colors.outlineVariant }]}>
                        <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                          ID Verification Proof
                        </Text>
                        {resident.idProofUrl ? (
                          <View style={[styles.imageContainer, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md }]}>
                            <Image
                              source={{ uri: resident.idProofUrl }}
                              style={styles.idProofImage}
                              resizeMode="contain"
                            />
                          </View>
                        ) : (
                          <View style={[styles.noImagePlaceholder, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md }]}>
                            <MaterialIcons name="image-not-supported" size={24} color={colors.outline} />
                            <Text style={{ color: colors.outline, fontSize: 12, marginTop: 4 }}>No ID proof uploaded</Text>
                          </View>
                        )}

                        <View style={styles.actionButtonRow}>
                          <TouchableOpacity
                            style={[styles.rejectButton, { borderColor: colors.error }]}
                            onPress={() => handleApprovalAction(resident.id, 'REJECTED')}
                          >
                            <Text style={[styles.rejectButtonText, { color: colors.error }]}>Reject</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.approveButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleApprovalAction(resident.id, 'APPROVED')}
                          >
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  screenHeader: {
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  residentCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
  },
  residentDetails: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingLeft: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imageContainer: {
    height: 180,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idProofImage: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
