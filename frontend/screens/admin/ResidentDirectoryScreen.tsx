import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  TextInput,
  RefreshControl } from 'react-native';
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

interface ResidentDirectoryScreenProps {
  onGoBack: () => void;
}

export default function ResidentDirectoryScreen({
  onGoBack,
}: ResidentDirectoryScreenProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchResidents = async (query = '') => {
    try {
      const profileRes = await apiClient.get('/auth/me');
      const societyId = profileRes.data.society_id;

      if (societyId) {
        let url = `/residents?society_id=${societyId}`;
        if (query.trim()) {
          url += `&search_query=${encodeURIComponent(query.trim())}`;
        }
        const response = await apiClient.get(url);
        setResidents(response.data);
      }
    } catch (err) {
      console.error('Failed to load residents directory', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    fetchResidents(searchQuery);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResidents(searchQuery);
  };

  const renderItem = ({ item }: { item: Resident }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.full_name?.charAt(0) || 'R'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nameText}>{item.full_name}</Text>
        <Text style={styles.flatText}>
          Flat: {item.flat?.floor?.wing?.name || ''}-{item.flat?.number || 'Unassigned'}
        </Text>
        <Text style={styles.contactText}>✉️ {item.email}</Text>
        {item.phone && <Text style={styles.contactText}>📞 {item.phone}</Text>}
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
        <Text style={styles.headerTitle}>Resident Directory</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, wing or flat..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
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
              <Text style={styles.emptyText}>No residents found matching criteria.</Text>
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
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: '#2F6FED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F6FED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  flatText: {
    fontSize: 13,
    color: '#2F6FED',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
  },
  contactText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
