import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LINE_ITEMS = [
  { icon: 'home-work' as const, label: 'Monthly Maintenance', sub: 'Standard housing fee', amount: 4000 },
  { icon: 'savings' as const, label: 'Sinking Fund', sub: 'Capital repairs reserve', amount: 300 },
  { icon: 'history' as const, label: 'Late Fee', sub: 'Prev. month carry forward', amount: 200 },
];

export function CurrentBillScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const total = LINE_ITEMS.reduce((sum, item) => sum + item.amount, 0);

  function handlePay() {
    // TODO: wire to Razorpay create-order + verify flow (Phase 12 backend)
    navigation.navigate('PaymentSuccess', { amount: total, transactionId: `HS${Date.now()}` });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="HomeSync"
        rightIcon="history"
        onRightPress={() => navigation.navigate('PaymentHistory')}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg, paddingBottom: 120 }}>
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroLabel}>Maintenance Due</Text>
          <Text style={styles.heroAmount}>₹{total.toLocaleString('en-IN')}</Text>
          <View style={styles.heroDueRow}>
            <MaterialIcons name="event" size={16} color="#FFFFFF" />
            <Text style={styles.heroDueText}>Due: Aug 15</Text>
          </View>
        </View>

        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Bill Breakdown</Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Invoice #2026-07</Text>
          </View>
          <Card style={{ gap: 0 }}>
            {LINE_ITEMS.map((item, i) => (
              <View
                key={item.label}
                style={[
                  styles.lineItem,
                  i < LINE_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
                ]}
              >
                <View style={[styles.lineIcon, { backgroundColor: colors.primary + '14' }]}>
                  <MaterialIcons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 14 }}>{item.label}</Text>
                  <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{item.sub}</Text>
                </View>
                <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 16 }}>
                  ₹{item.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '20' }]}>
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, flex: 1, lineHeight: 18 }}>
            Paying before the due date earns you 50 HomePoints redeemable at partner stores. Late payments may attract
            additional charges.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: colors.secondary }]} onPress={handlePay}>
          <MaterialIcons name="lock" size={20} color="#FFFFFF" />
          <Text style={styles.payButtonText}>Pay Now (₹{total.toLocaleString('en-IN')})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  heroLabel: { color: '#FFFFFF', fontSize: 12, opacity: 0.85, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginBottom: 12 },
  heroAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', marginBottom: 8 },
  heroDueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroDueText: { color: '#FFFFFF', opacity: 0.9, fontSize: 14 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  lineIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  payButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
