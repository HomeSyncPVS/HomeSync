import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl } from 'react-native';
import { apiClient } from '../utils/api';

interface MyBillsScreenProps {
  onSelectBill: (billId: string) => void;
  apiBaseUrl?: string;
}

interface BillSummary {
  id: string;
  bill_number: string;
  amount: number;
  due_date: string;
  status: string;
  bill_type: string;
}

export default function MyBillsScreen({ onSelectBill }: MyBillsScreenProps) {
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await apiClient.get('/bills');
      // Ensure we parse the list properly
      setBills(response.data || []);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to retrieve bills.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return { bg: '#E6F7F0', text: '#34B37A' }; // Success
      case 'OVERDUE':
        return { bg: '#FEECEC', text: '#E5484D' }; // Error
      case 'PARTIALLY_PAID':
      case 'SENT':
      case 'GENERATED':
      default:
        return { bg: '#EEF4FF', text: '#2F6FED' }; // Primary
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderBillCard = ({ item }: { item: BillSummary }) => {
    const { bg, text } = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectBill(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.billNumberText}>{item.bill_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={[styles.statusBadgeText, { color: text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.label}>BILL TYPE</Text>
            <Text style={styles.value}>{item.bill_type}</Text>
          </View>
          <View style={styles.alignRight}>
            <Text style={styles.label}>DUE DATE</Text>
            <Text style={styles.value}>{formatDate(item.due_date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>My Bills</Text>
          <Text style={styles.subtitleText}>Review and clear outstanding dues for your flat</Text>
        </View>

        {errorMessage ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchBills}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id}
            renderItem={renderBillCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#2F6FED']}
                tintColor="#2F6FED"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bills found for your flat.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 6,
    fontFamily: 'System',
  },
  subtitleText: {
    fontSize: 15,
    color: '#687588',
    fontFamily: 'System',
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9EA6B5',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9EA6B5',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#384252',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#687588',
  },
  errorCard: {
    alignItems: 'center',
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2F6FED',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
