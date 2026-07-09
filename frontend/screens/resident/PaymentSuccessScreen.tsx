import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar } from 'react-native';

interface PaymentSuccessScreenProps {
  route: {
    params: {
      amount: number;
      billNumber: string;
      transactionId: string;
      paymentId: string;
    };
  };
  onNavigateToScreen: (screen: string, params?: any) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function PaymentSuccessScreen({
  route,
  onNavigateToScreen,
  onNavigateToTab,
}: PaymentSuccessScreenProps) {
  const { amount, billNumber, transactionId, paymentId } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>
          Your maintenance payment has been received and processed successfully.
        </Text>

        {/* Receipt Details Box */}
        <View style={styles.receiptBox}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount Paid</Text>
            <Text style={styles.receiptValue}>${amount?.toLocaleString() || '0.00'}</Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Bill Reference</Text>
            <Text style={styles.receiptValue}>{billNumber}</Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction Reference</Text>
            <Text style={styles.receiptValue}>{transactionId}</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => onNavigateToScreen('ReceiptDetail', { paymentId: paymentId })}
        >
          <Text style={styles.receiptButtonText}>View Receipt / PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => onNavigateToTab('bills')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8FDF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    color: '#34B37A',
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  receiptBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  receiptButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  doneButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
