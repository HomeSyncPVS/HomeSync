import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PaymentSuccess'>;
type Rt = RouteProp<RootStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { colors, spacing } = useTheme();
  const { amount, transactionId } = route.params;

  function handleBackHome() {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'ResidentTabs' }] })
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.containerMargin }]}>
      <Card style={styles.card}>
        <View style={[styles.checkCircle, { backgroundColor: colors.secondary + '20' }]}>
          <MaterialIcons name="check-circle" size={48} color={colors.secondary} />
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>Payment Successful</Text>
        <Text style={{ color: colors.onSurfaceVariant, marginBottom: 24 }}>
          Your transaction has been processed securely.
        </Text>

        <View style={[styles.detailsBox, { backgroundColor: colors.surfaceContainerLow }]}>
          <View style={[styles.detailRow, { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1 }]}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Amount Paid</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>
              ₹{amount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <View>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 10, textTransform: 'uppercase' }}>
                Transaction ID
              </Text>
              <Text style={{ color: colors.onSurface, fontSize: 13, fontWeight: '600' }}>{transactionId}</Text>
            </View>
            <MaterialIcons name="content-copy" size={18} color={colors.outline} />
          </View>
        </View>

        <TouchableOpacity style={[styles.homeButton, { backgroundColor: colors.primary }]} onPress={handleBackHome}>
          <MaterialIcons name="home" size={20} color="#FFFFFF" />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.receiptButton, { borderColor: colors.primary }]}>
          <MaterialIcons name="download" size={20} color={colors.primary} />
          <Text style={[styles.receiptButtonText, { color: colors.primary }]}>Download Receipt</Text>
        </TouchableOpacity>

        <Text style={{ color: colors.outline, fontSize: 11, marginTop: 20 }}>
          Receipt sent to <Text style={{ color: colors.onSurface }}>resident@example.com</Text>
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  card: { alignItems: 'center', paddingVertical: 32 },
  checkCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  detailsBox: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  homeButton: { width: '100%', height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  homeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  receiptButton: { width: '100%', height: 52, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  receiptButtonText: { fontWeight: '700', fontSize: 15 },
});
