import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView } from 'react-native';
import { apiClient } from '../utils/api';
import { deleteTokens } from '../utils/storage';

interface ProfileScreenProps {
  onLogout: () => void;
}

interface UserProfile {
  full_name: string;
  email: string;
  phone?: string;
  role?: {
    name: string;
    description?: string;
  };
  approval_status: string;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.get('/auth/me');
      setProfile(response.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = await apiClient.defaults.headers.common['Authorization']; // Get if cached or storage
      // Opt-in calling logout endpoint to clean session on backend
      await apiClient.post('/auth/logout', {});
    } catch (err) {
      console.warn('Backend session cleanup skipped or failed');
    } finally {
      await deleteTokens();
      onLogout();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>Profile</Text>
          <Text style={styles.subtitleText}>Manage your society identity and credentials</Text>
        </View>

        {errorMessage ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          profile && (
            <View>
              {/* Profile Card */}
              <View style={styles.card}>
                {/* Avatar Badge */}
                <View style={styles.avatarRow}>
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarBadgeText}>
                      {profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.avatarMeta}>
                    <Text style={styles.nameText}>{profile.full_name}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{profile.role?.name || 'Resident'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Details Section */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue}>{profile.email}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>{profile.phone || 'Not provided'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Approval Status</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      profile.approval_status === 'APPROVED' ? styles.statusApproved : styles.statusPending,
                    ]}
                  >
                    {profile.approval_status}
                  </Text>
                </View>
              </View>

              {/* Actions Card */}
              <View style={[styles.card, styles.actionsCard]}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                  <Text style={styles.logoutButtonText}>Sign Out of Device</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
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
  headerContainer: {
    marginBottom: 28,
  },
  titleText: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: 'System',
    fontSize: 15,
    color: '#687588',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2F6FED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarBadgeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  avatarMeta: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D4E2FC',
  },
  badgeText: {
    color: '#2F6FED',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9EA6B5',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#384252',
    fontWeight: '500',
  },
  statusApproved: {
    color: '#34B37A',
    fontWeight: '600',
  },
  statusPending: {
    color: '#E5484D',
    fontWeight: '600',
  },
  actionsCard: {
    padding: 16,
  },
  logoutButton: {
    backgroundColor: '#FEECEC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#E5484D',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#E5484D',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2F6FED',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
