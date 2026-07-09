import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiClient } from '../utils/api';

interface ReceiptDetailScreenProps {
  paymentId: string;
  onGoBack: () => void;
}

interface PaymentDetails {
  id: string;
  payment_number?: string;
  bill_number?: string;
  amount: number;
  status: string;
  payment_method: string;
  transaction_reference?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  bill?: {
    bill_type: string;
    due_date: string;
  };
}

export default function ReceiptDetailScreen({ paymentId, onGoBack }: ReceiptDetailScreenProps) {
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/payments/${paymentId}`);
      setPayment(response.data);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to retrieve transaction details.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!payment) return;
    setSharing(true);

    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(payment.amount);

    const txnDate = new Date(payment.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #EEF2F6; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #2F6FED; margin: 0; }
            .subtitle { font-size: 14px; color: #687588; margin-top: 5px; }
            .amount-box { text-align: center; background: #F7F8FA; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
            .amount-label { font-size: 11px; font-weight: bold; color: #9EA6B5; text-transform: uppercase; letter-spacing: 0.5px; }
            .amount-val { font-size: 32px; font-weight: 800; color: #1E232C; margin-top: 5px; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .details-table td { padding: 12px 0; border-bottom: 1px solid #EEF2F6; font-size: 14px; }
            .details-table td.label { color: #687588; }
            .details-table td.value { text-align: right; font-weight: 600; color: #1E232C; }
            .footer { text-align: center; font-size: 12px; color: #9EA6B5; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">HomeSync Receipt</h1>
            <p class="subtitle">Official payment transaction confirmation statement</p>
          </div>
          <div class="amount-box">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-val">${formattedAmount}</div>
          </div>
          <table class="details-table">
            <tr>
              <td class="label">Receipt Number</td>
              <td class="value">${payment.payment_number || `REC-${payment.id.slice(0, 8).toUpperCase()}`}</td>
            </tr>
            <tr>
              <td class="label">Transaction Date</td>
              <td class="value">${txnDate}</td>
            </tr>
            <tr>
              <td class="label">Payment Status</td>
              <td class="value" style="color: #34B37A;">${payment.status}</td>
            </tr>
            <tr>
              <td class="label">Payment Method</td>
              <td class="value">${payment.payment_method}</td>
            </tr>
            <tr>
              <td class="label">Reference ID</td>
              <td class="value">${payment.transaction_reference || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Resident Account</td>
              <td class="value">${payment.user?.full_name || 'HomeSync Resident'}</td>
            </tr>
          </table>
          <div class="footer">
            <p>Thank you for keeping your society running smoothly.</p>
            <p>&copy; ${new Date().getFullYear()} HomeSync Services. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    try {
      // 1. Generate PDF file from HTML content
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // 2. Trigger native sharing dialog
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this platform.');
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export receipt.');
    } finally {
      setSharing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'PAID':
        return { bg: '#E6F7F0', text: '#34B37A' }; // Success
      case 'FAILED':
        return { bg: '#FEECEC', text: '#E5484D' }; // Error
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  if (errorMessage || !payment) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage || 'Payment details not found'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { bg, text } = getStatusColor(payment.status);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Header */}
        <TouchableOpacity style={styles.backLink} onPress={onGoBack} activeOpacity={0.7}>
          <Text style={styles.backLinkText}>← Payment History</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>Receipt</Text>
          <Text style={styles.subtitleText}>Payment Transaction Confirmation</Text>
        </View>

        {/* Card */}
        <View style={styles.receiptCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: bg }]}>
              <Text style={[styles.statusBadgeText, { color: text }]}>{payment.status}</Text>
            </View>
            <Text style={styles.paymentMethod}>{payment.payment_method}</Text>
          </View>

          <Text style={styles.totalLabel}>AMOUNT PAID</Text>
          <Text style={styles.totalAmount}>{formatCurrency(payment.amount)}</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receipt Number</Text>
            <Text style={styles.detailValue}>
              {payment.payment_number || `REC-${payment.id.slice(0, 8).toUpperCase()}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction Reference</Text>
            <Text style={styles.detailValue}>{payment.transaction_reference || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paid On</Text>
            <Text style={styles.detailValue}>{formatDate(payment.created_at)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Resident Name</Text>
            <Text style={styles.detailValue}>{payment.user?.full_name || 'Resident User'}</Text>
          </View>
        </View>

        {/* PDF Share Action Button */}
        <TouchableOpacity
          style={[styles.shareButton, sharing && styles.buttonDisabled]}
          onPress={generatePDF}
          disabled={sharing}
          activeOpacity={0.8}
        >
          {sharing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.shareButtonText}>Download / Share Receipt</Text>
          )}
        </TouchableOpacity>
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
  paymentMethod: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#687588',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E232C',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  shareButton: {
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
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
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
