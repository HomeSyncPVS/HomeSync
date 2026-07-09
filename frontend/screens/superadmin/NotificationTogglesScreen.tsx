import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert } from 'react-native';

interface NotificationTogglesScreenProps {
  onGoBack: () => void;
}

export default function NotificationTogglesScreen({
  onGoBack,
}: NotificationTogglesScreenProps) {
  const [preferences, setPreferences] = useState({
    push: true,
    email: true,
    sms: false,
  });

  const handleToggle = (key: 'push' | 'email' | 'sms') => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      Alert.alert(
        'Preferences Updated',
        `Notification channel updated successfully locally.`
      );
      return updated;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.badgeBanner}>
        <Text style={styles.badgeText}>BETA / MOCK MODE ACTIVE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Notifications Channels</Text>
        <Text style={styles.sectionDesc}>Select how you would like to receive notices and billing reminders.</Text>

        <View style={styles.optionsList}>
          <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Push Notifications</Text>
              <Text style={styles.optionDesc}>Receive notices instantly on your mobile app</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, preferences.push ? styles.toggleOn : styles.toggleOff]}
              onPress={() => handleToggle('push')}
            >
              <Text style={[styles.toggleText, preferences.push ? styles.toggleTextOn : styles.toggleTextOff]}>
                {preferences.push ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Email Updates</Text>
              <Text style={styles.optionDesc}>Receive payment invoices and reports in inbox</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, preferences.email ? styles.toggleOn : styles.toggleOff]}
              onPress={() => handleToggle('email')}
            >
              <Text style={[styles.toggleText, preferences.email ? styles.toggleTextOn : styles.toggleTextOff]}>
                {preferences.email ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>SMS Alerts</Text>
              <Text style={styles.optionDesc}>Receive critical emergency alerts via text messages</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, preferences.sms ? styles.toggleOn : styles.toggleOff]}
              onPress={() => handleToggle('sms')}
            >
              <Text style={[styles.toggleText, preferences.sms ? styles.toggleTextOn : styles.toggleTextOff]}>
                {preferences.sms ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 24,
  },
  optionsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  toggleOn: {
    backgroundColor: '#E8FDF3',
  },
  toggleOff: {
    backgroundColor: '#F1F5F9',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleTextOn: {
    color: '#34B37A',
  },
  toggleTextOff: {
    color: '#64748B',
  },
});
