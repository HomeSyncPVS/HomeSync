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

interface PaymentHistoryScreenProps {
  onSelectPayment: (paymentId: string) => void;
}

interface PaymentSummary {
  id: string;
  payment_number?: string;
  bill_number?: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export default function PaymentHistoryScreen({ onSelectPayment }: PaymentHistoryScreenProps) {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await apiClient.get('/payments/history');
      setPayments(response.data || []);
      setErrorMessage(null);
    } catch (err: any) {
      // Fallback to fetch via /payments if /payments/history is not mapped exactly
      try {
        const fallbackResponse = await apiClient.get('/payments');
        setPayments(fallbackResponse.data || []);
        setErrorMessage(null);
      } catch (fallbackErr: any) {
        setErrorMessage(err.response?.data?.detail || 'Failed to retrieve payment history.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'PAID':
        return { bg: '#E6F7F0', text: '#34B37A' }; // Success
      case 'FAILED':
        return { bg: '#FEECEC', text: '#E5484D' }; // Error
      case 'PENDING':
      default:
        return { bg: '#FFF9E6', text: '#D99B00' }; // Warning
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

  const renderPaymentCard = ({ item }: { item: PaymentSummary }) => {
    const { bg, text } = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectPayment(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.paymentId}>
              {item.payment_number || `TXN-${item.id.slice(0, 8).toUpperCase()}`}
            </Text>
            <Text style={styles.paymentMethod}>{item.payment_method}</Text>
          </View>
          <View style={styles.alignRight}>
            <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: bg }]}>
              <Text style={[styles.statusBadgeText, { color: text }]}>{item.status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardFooter}>
          <Text style={styles.dateLabel}>TRANSACTION DATE</Text>
          <Text style={styles.dateValue}>{formatDate(item.created_at)}</Text>
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
          <Text style={styles.titleText}>Payment History</Text>
          <Text style={styles.subtitleText}>Track and view details of your past transactions</Text>
        </View>

        {errorMessage ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPayments}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            renderItem={renderPaymentCard}
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
                <Text style={styles.emptyText}>No transactions recorded yet.</Text>
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
  },
  subtitleText: {
    fontSize: 15,
    color: '#687588',
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9EA6B5',
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9EA6B5',
  },
  dateValue: {
    fontSize: 13,
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
