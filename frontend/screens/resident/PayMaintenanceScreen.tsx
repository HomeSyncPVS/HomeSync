import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput } from 'react-native';
import { apiClient } from '../../utils/api';

interface PayMaintenanceScreenProps {
  route: {
    params: {
      billId: string;
      amount: number;
      billNumber: string;
    };
  };
  onNavigateToScreen: (screen: string, params?: any) => void;
  onGoBack: () => void;
}

export default function PayMaintenanceScreen({
  route,
  onNavigateToScreen,
  onGoBack,
}: PayMaintenanceScreenProps) {
  const { billId, amount, billNumber } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'UPI' | 'BANK_TRANSFER'>('ONLINE');
  const [paymentStep, setPaymentStep] = useState<'INITIAL' | 'SIMULATING' | 'VERIFYING'>('INITIAL');
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Simulation input
  const [utr, setUtr] = useState('');

  const handleInitializePayment = async () => {
    setLoading(true);
    try {
      // 1. Call backend to create order
      const response = await apiClient.post('/payments/create-order', {
        bill_id: billId,
        payment_method: paymentMethod,
      });

      const order = response.data;
      setOrderId(order.order_id);
      
      // Auto-fill a mock UTR for verification ease
      setUtr('HS-MOCK-' + Math.floor(Math.random() * 900000 + 100000));
      setPaymentStep('SIMULATING');
    } catch (err: any) {
      Alert.alert('Payment Error', err.response?.data?.detail || 'Failed to initialize payment order.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!utr.trim()) {
      Alert.alert('Validation Error', 'Please enter Transaction ID / UTR.');
      return;
    }

    setLoading(true);
    setPaymentStep('VERIFYING');
    try {
      // 2. Call backend to verify transaction status
      const response = await apiClient.post('/payments/verify', {
        order_id: orderId,
        transaction_reference: utr.trim(),
        payment_method: paymentMethod,
        amount_paid: amount,
      });

      const payment = response.data;

      if (payment.status === 'COMPLETED' || payment.status === 'SUCCESS' || payment.status === 'PAID') {
        onNavigateToScreen('PaymentSuccess', {
          amount: payment.amount,
          billNumber: billNumber,
          transactionId: payment.transaction_reference || utr.trim(),
          paymentId: payment.id,
        });
      } else {
        setPaymentStep('INITIAL');
        Alert.alert('Payment Failed', `Payment verification returned status: ${payment.status}`);
      }
    } catch (err: any) {
      setPaymentStep('SIMULATING');
      Alert.alert('Verification Error', err.response?.data?.detail || 'Payment verification failed.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack} disabled={loading}>
          <Text style={styles.backButtonText}>❮ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay Maintenance</Text>
        <View style={{ width: 60 }} />
      </View>

      {paymentStep === 'INITIAL' && (
        <View style={styles.content}>
          <View style={styles.billSummaryCard}>
            <Text style={styles.summaryLabel}>Bill Number</Text>
            <Text style={styles.summaryValue}>{billNumber}</Text>
            
            <View style={styles.divider} />

            <Text style={styles.summaryLabel}>Amount Due</Text>
            <Text style={styles.amountText}>${amount?.toLocaleString() || '0.00'}</Text>
          </View>

          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'ONLINE' && styles.methodCardActive]}
            onPress={() => setPaymentMethod('ONLINE')}
          >
            <Text style={styles.methodIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>Credit / Debit Card</Text>
              <Text style={styles.methodDesc}>Instant confirmation via secure payment gateway</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'UPI' && styles.methodCardActive]}
            onPress={() => setPaymentMethod('UPI')}
          >
            <Text style={styles.methodIcon}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>UPI (GPay / PhonePe / Paytm)</Text>
              <Text style={styles.methodDesc}>Pay via your linked UPI application</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'BANK_TRANSFER' && styles.methodCardActive]}
            onPress={() => setPaymentMethod('BANK_TRANSFER')}
          >
            <Text style={styles.methodIcon}>🏦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>Net Banking / IMPS</Text>
              <Text style={styles.methodDesc}>Direct bank-to-bank electronic transfer</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.payButton} onPress={handleInitializePayment} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>Proceed to Pay ${amount?.toLocaleString()}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {paymentStep === 'SIMULATING' && (
        <View style={styles.content}>
          <View style={styles.simulateCard}>
            <Text style={styles.simulateTitle}>💳 Gateway Simulator</Text>
            <Text style={styles.simulateSubtitle}>
              We are simulating a checkout flow for {paymentMethod} method.
            </Text>

            <View style={styles.simulateAmountCard}>
              <Text style={styles.simulateAmountLabel}>Paying</Text>
              <Text style={styles.simulateAmountValue}>${amount?.toLocaleString()}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Transaction ID / UTR Reference</Text>
              <TextInput
                style={styles.input}
                value={utr}
                onChangeText={setUtr}
                placeholder="UTR / Ref Number"
              />
              <Text style={styles.helperText}>Automatically generated for test simulation.</Text>
            </View>

            <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyPayment} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Confirm & Verify Payment</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.simulateCancel} onPress={() => setPaymentStep('INITIAL')} disabled={loading}>
              <Text style={styles.simulateCancelText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {paymentStep === 'VERIFYING' && (
        <View style={[styles.content, styles.verifyingContainer]}>
          <ActivityIndicator size="large" color="#2F6FED" />
          <Text style={styles.verifyingTitle}>Verifying Transaction</Text>
          <Text style={styles.verifyingSubtitle}>
            Please do not close the application or press back. We are verifying the payment status with your banking partner...
          </Text>
        </View>
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
    color: '#E5484D',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  billSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  amountText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2F6FED',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  methodCardActive: {
    borderColor: '#2F6FED',
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  methodName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  methodDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  payButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  simulateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  simulateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  simulateSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  simulateAmountCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  simulateAmountLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  simulateAmountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 20,
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
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  verifyButton: {
    backgroundColor: '#34B37A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  simulateCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  simulateCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  verifyingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 20,
  },
  verifyingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
