import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView } from 'react-native';

interface PlatformAnalyticsScreenProps {
  onGoBack: () => void;
}

export default function PlatformAnalyticsScreen({ onGoBack }: PlatformAnalyticsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Console</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Analytics</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titleText}>Growth Overview</Text>
        <Text style={styles.subtitleText}>Performance indicators aggregated across all societies.</Text>

        <View style={styles.chartMock}>
          <Text style={styles.chartMockText}>📈 Chart Placeholder (Society Sign-ups)</Text>
          <Text style={styles.chartSubText}>+12% month-over-month platform growth rate</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>User Engagement Rate</Text>
          <Text style={styles.statsValue}>84.5%</Text>
          <Text style={styles.statsHelp}>Daily active residents compared to registered users.</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Average Bills Collected</Text>
          <Text style={styles.statsValue}>92.1%</Text>
          <Text style={styles.statsHelp}>Maintenance collections completed within deadline.</Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 24,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 24,
  },
  chartMock: {
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  chartMockText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  chartSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statsTitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2F6FED',
    marginVertical: 4,
  },
  statsHelp: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
