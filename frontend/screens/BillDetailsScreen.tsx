import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView } from 'react-native';
import { apiClient } from '../utils/api';

interface BillDetailsScreenProps {
  billId: string;
  onGoBack: () => void;
  onPayNow: (billId: string) => void;
}

interface BillLineItem {
  id: string;
  name: string;
  amount: number;
}

interface BillDetails {
  id: string;
  bill_number: string;
  amount: number;
  due_date: string;
  status: string;
  bill_type: string;
  line_items?: BillLineItem[];
}

export default function BillDetailsScreen({ billId, onGoBack, onPayNow }: BillDetailsScreenProps) {
  const [bill, setBill] = useState<BillDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBillDetails();
  }, [billId]);

  const fetchBillDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/bills/${billId}`);
      setBill(response.data);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to retrieve bill details.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return { bg: '#E6F7F0', text: '#34B37A' }; // Success
      case 'OVERDUE':
        return { bg: '#FEECEC', text: '#E5484D' }; // Error
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  if (errorMessage || !bill) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage || 'Bill not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { bg, text } = getStatusColor(bill.status);
  const isUnpaid = bill.status.toUpperCase() !== 'PAID';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Header */}
        <TouchableOpacity style={styles.backLink} onPress={onGoBack} activeOpacity={0.7}>
          <Text style={styles.backLinkText}>← Bills List</Text>
        </TouchableOpacity>

        {/* Invoice Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>Invoice Details</Text>
          <Text style={styles.subtitleText}>{bill.bill_number}</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: bg }]}>
              <Text style={[styles.statusBadgeText, { color: text }]}>{bill.status}</Text>
            </View>
            <Text style={styles.billType}>{bill.bill_type}</Text>
          </View>

          <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
          <Text style={styles.totalAmount}>{formatCurrency(bill.amount)}</Text>

          <View style={styles.divider} />

          {/* Line items details */}
          <Text style={styles.sectionTitle}>Breakdown</Text>
          {bill.line_items && bill.line_items.length > 0 ? (
            bill.line_items.map((item) => (
              <View key={item.id} style={styles.lineItem}>
                <Text style={styles.lineItemName}>{item.name}</Text>
                <Text style={styles.lineItemAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.lineItem}>
              <Text style={styles.lineItemName}>Society Maintenance Fees</Text>
              <Text style={styles.lineItemAmount}>{formatCurrency(bill.amount)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Metadata */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Due Date</Text>
            <Text style={styles.metaValue}>{formatDate(bill.due_date)}</Text>
          </View>
        </View>

        {/* Action Button */}
        {isUnpaid && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => onPayNow(bill.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 4,
  },
  backLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F6FED',
  },
  headerContainer: {
    marginBottom: 28,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 15,
    color: '#9EA6B5',
    fontWeight: '600',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  billType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9EA6B5',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9EA6B5',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1E232C',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemName: {
    fontSize: 15,
    color: '#687588',
  },
  lineItemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#384252',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: '#687588',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E232C',
  },
  payButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6FED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#E5484D',
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#2F6FED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
