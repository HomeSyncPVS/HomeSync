import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert } from 'react-native';
import { superadminApi, SocietySubscription } from '../../api/superadmin.mock';

interface SubscriptionManagementScreenProps {
  onGoBack: () => void;
}

export default function SubscriptionManagementScreen({
  onGoBack,
}: SubscriptionManagementScreenProps) {
  const [subs, setSubs] = useState<SocietySubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      const data = await superadminApi.listSubscriptions();
      setSubs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleUpdatePlan = (societyId: string, currentPlan: string) => {
    const plans = ['Basic', 'Premium', 'Enterprise'];
    const nextPlan = plans[(plans.indexOf(currentPlan) + 1) % plans.length] as any;
    
    Alert.alert(
      'Modify Subscription Plan',
      `Upgrade plan to: ${nextPlan}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Plan',
          onPress: async () => {
            setLoading(true);
            try {
              await superadminApi.updateSubscription(societyId, { plan: nextPlan });
              fetchSubscriptions();
              Alert.alert('Plan Updated', `Society plan has been set to ${nextPlan}.`);
            } catch (err: any) {
              Alert.alert('Error', err.message);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SocietySubscription }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.planText}>Plan: {item.plan} • Status: {item.status}</Text>
        <Text style={styles.renewalText}>Renewal Date: {item.renewalDate}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleUpdatePlan(item.societyId, item.plan)}
      >
        <Text style={styles.actionText}>Change Plan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Console</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={subs}
          keyExtractor={(item) => item.societyId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No society subscriptions listed.</Text>
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
  badgeBanner: {
    backgroundColor: '#EEF2F6',
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
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
  nameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  planText: {
    fontSize: 13,
    color: '#2F6FED',
    fontWeight: '600',
    marginTop: 4,
  },
  renewalText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: 'bold',
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
