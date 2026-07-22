import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { apiClient } from '../../utils/api';

interface SubscriptionData {
  plan_name: str;
  total_flats: number;
  price_per_year: number;
  ad_level: string;
  recommended_plan: string;
  recommended_price: number;
}

interface SubscriptionScreenProps {
  onGoBack: () => void;
}

export default function SubscriptionScreen({ onGoBack }: SubscriptionScreenProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await apiClient.get('/subscriptions/current');
      setSubscription(res.data);
    } catch (err) {
      console.warn('Failed to load subscription plan', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Society Subscription</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.planCard}>
            <Text style={styles.cardBadge}>Active Tier</Text>
            <Text style={styles.planTitle}>{subscription?.plan_name} Plan</Text>
            <Text style={styles.flatsCount}>Total Building Flats: {subscription?.total_flats}</Text>
            <Text style={styles.planPrice}>
              {subscription?.price_per_year === 0 ? 'FREE' : `₹${subscription?.price_per_year.toLocaleString()}/year`}
            </Text>
            <Text style={styles.adPolicy}>Ad Experience: {subscription?.ad_level}</Text>
          </View>

          <Text style={styles.sectionTitle}>Available Subscription Plans</Text>

          {/* Plan Tiers Table */}
          <View style={styles.tierBox}>
            <View style={styles.tierRow}>
              <Text style={styles.tierName}>Free Plan (Up to 10 Flats)</Text>
              <Text style={styles.tierPrice}>₹0/year</Text>
            </View>
            <View style={styles.tierRow}>
              <Text style={styles.tierName}>Standard (11 - 25 Flats)</Text>
              <Text style={styles.tierPrice}>₹1,799/year</Text>
            </View>
            <View style={styles.tierRow}>
              <Text style={styles.tierName}>Professional (26 - 50 Flats)</Text>
              <Text style={styles.tierPrice}>₹3,499/year</Text>
            </View>
            <View style={styles.tierRow}>
              <Text style={styles.tierName}>Enterprise (51+ Flats)</Text>
              <Text style={styles.tierPrice}>₹6,499/year</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  backButton: { paddingVertical: 8 },
  backButtonText: { color: '#2F6FED', fontWeight: '600', fontSize: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  planCard: { backgroundColor: '#2F6FED', borderRadius: 20, padding: 24, marginBottom: 24, alignItems: 'center' },
  cardBadge: { color: '#D4E2FC', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  planTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  flatsCount: { color: '#E2E8F0', fontSize: 14, marginTop: 4 },
  planPrice: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 12 },
  adPolicy: { color: '#93C5FD', fontSize: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  tierBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tierName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  tierPrice: { fontSize: 14, fontWeight: '700', color: '#2F6FED' },
});
