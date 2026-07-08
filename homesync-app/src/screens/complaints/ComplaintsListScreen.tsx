import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { StatusChip } from '../../components/StatusChip';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterStatus = 'All' | 'Open' | 'In Progress' | 'Closed';

interface Complaint {
  id: string;
  title: string;
  residentName: string;
  flatNumber: string;
  status: 'Open' | 'In Progress' | 'Closed';
  date: string;
  category: string;
}

export function ComplaintsListScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('All');
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Load complaints from API (Simulated GET /complaints/)
  const loadComplaints = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setComplaints([
        {
          id: 'cmp-101',
          title: 'Water Seepage in Bedroom Wall',
          residentName: 'Amit Shah',
          flatNumber: 'A-703',
          status: 'Open',
          date: 'Today, 11:30 AM',
          category: 'Plumbing',
        },
        {
          id: 'cmp-102',
          title: 'Power Socket Sparking',
          residentName: 'Kunal Verma',
          flatNumber: 'B-1102',
          status: 'In Progress',
          date: 'Yesterday, 04:15 PM',
          category: 'Electrical',
        },
        {
          id: 'cmp-103',
          title: 'Main Lobby Door Lock Broken',
          residentName: 'Sunita Rao',
          flatNumber: 'C-201',
          status: 'Closed',
          date: 'Jul 06, 2026',
          category: 'Security',
        },
        {
          id: 'cmp-104',
          title: 'Elevator Fan Noise',
          residentName: 'Staff Admin',
          flatNumber: 'Tower A',
          status: 'In Progress',
          date: 'Jul 05, 2026',
          category: 'Electrical',
        },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve complaints.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComplaints();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    loadComplaints().then(() => setLoading(false));
  }, []);

  const getStatusTone = (status: 'Open' | 'In Progress' | 'Closed') => {
    if (status === 'Open') return 'warning'; // Amber mapping
    if (status === 'In Progress') return 'info'; // Blue mapping
    return 'success'; // Green/Closed mapping
  };

  // Filter complaints based on Search query and Status filter chips
  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = selectedFilter === 'All' || c.status === selectedFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.flatNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Complaints" showBack={true} />
      
      {/* Search and Filters panel */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderRadius: radius.md }]}>
          <MaterialIcons name="search" size={20} color={colors.outline} />
          <TextInput
            placeholder="Search title, resident, flat..."
            placeholderTextColor={colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="cancel" size={18} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {(['All', 'Open', 'In Progress', 'Closed'] as FilterStatus[]).map((f) => {
            const isSelected = selectedFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    borderRadius: radius.full,
                  },
                ]}
                onPress={() => setSelectedFilter(f)}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.onSurfaceVariant,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        {filteredComplaints.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialIcons name="assignment-turned-in" size={48} color={colors.outline} />
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>No complaints found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              Try altering your filter selections or keyword query.
            </Text>
          </Card>
        ) : (
          filteredComplaints.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ComplaintDetail', { complaintId: c.id })}
            >
              <Card style={styles.complaintCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.complaintTitle, { color: colors.onSurface }]} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <StatusChip label={c.status} tone={getStatusTone(c.status)} />
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="person" size={14} color={colors.outline} />
                    <Text style={[styles.detailText, { color: colors.onSurfaceVariant }]}>
                      {c.residentName} ({c.flatNumber})
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={14} color={colors.outline} />
                    <Text style={[styles.detailText, { color: colors.onSurfaceVariant }]}>{c.date}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button strictly as per spec */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('RaiseComplaint')}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
  },
  complaintCard: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  complaintTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6FED',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
