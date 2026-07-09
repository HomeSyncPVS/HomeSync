import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OtpVerificationScreen from './screens/OtpVerificationScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
import MyBillsScreen from './screens/MyBillsScreen';
import BillDetailsScreen from './screens/BillDetailsScreen';
import PaymentHistoryScreen from './screens/PaymentHistoryScreen';
import ReceiptDetailScreen from './screens/ReceiptDetailScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import RevenueOverviewScreen from './screens/RevenueOverviewScreen';
import ResidencyOnboardingScreen from './screens/ResidencyOnboardingScreen';

// Resident Screens
import ResidentDashboardScreen from './screens/resident/ResidentDashboardScreen';
import FamilyMembersScreen from './screens/resident/FamilyMembersScreen';
import VehiclesScreen from './screens/resident/VehiclesScreen';
import PayMaintenanceScreen from './screens/resident/PayMaintenanceScreen';
import PaymentSuccessScreen from './screens/resident/PaymentSuccessScreen';
import NoticeListScreen from './screens/resident/NoticeListScreen';
import NoticeDetailsScreen from './screens/resident/NoticeDetailsScreen';
import EventListScreen from './screens/resident/EventListScreen';
import EventDetailsScreen from './screens/resident/EventDetailsScreen';
import RaiseComplaintScreen from './screens/resident/RaiseComplaintScreen';
import MyComplaintsScreen from './screens/resident/MyComplaintsScreen';
import NotificationsScreen from './screens/resident/NotificationsScreen';

// Admin / Committee Screens
import CommitteeDashboardScreen from './screens/admin/CommitteeDashboardScreen';
import AdminComplaintsListScreen from './screens/admin/AdminComplaintsListScreen';
import AdminComplaintDetailsScreen from './screens/admin/AdminComplaintDetailsScreen';
import NoticeManagementScreen from './screens/admin/NoticeManagementScreen';
import CreateNoticeScreen from './screens/admin/CreateNoticeScreen';
import AdminEventListScreen from './screens/admin/AdminEventListScreen';
import CreateEventScreen from './screens/admin/CreateEventScreen';
import ManageRsvpsScreen from './screens/admin/ManageRsvpsScreen';
import EventGalleryScreen from './screens/admin/EventGalleryScreen';
import ResidentApprovalsScreen from './screens/admin/ResidentApprovalsScreen';
import ResidentDirectoryScreen from './screens/admin/ResidentDirectoryScreen';

// Super Admin Screens
import SuperAdminDashboardScreen from './screens/superadmin/SuperAdminDashboardScreen';
import SocietyManagementScreen from './screens/superadmin/SocietyManagementScreen';
import SubscriptionManagementScreen from './screens/superadmin/SubscriptionManagementScreen';
import PlatformAnalyticsScreen from './screens/superadmin/PlatformAnalyticsScreen';
import RolesPermissionsScreen from './screens/superadmin/RolesPermissionsScreen';
import NotificationTogglesScreen from './screens/superadmin/NotificationTogglesScreen';
import AuditLogsScreen from './screens/superadmin/AuditLogsScreen';

import { getAccessToken, getUserRole, saveTokens, deleteTokens } from './utils/storage';
import { registerLogoutHandler, API_BASE_URL, apiClient } from './utils/api';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    // Active styling highlight placeholder
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9EA6B5',
  },
  tabTextActive: {
    color: '#2F6FED',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  lockedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  pendingBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pendingBadgeIcon: {
    fontSize: 32,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },
  pendingTip: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
  },
  cancelRequestButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  cancelRequestText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  pendingLogoutButton: {
    padding: 8,
  },
  pendingLogoutText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});

type AppState = 'checking' | 'login' | 'register' | 'otp' | 'forgot_password' | 'reset_password' | 'dashboard';
type DashboardTab = 'home' | 'bills' | 'payments' | 'analytics' | 'profile';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('checking');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [otpTarget, setOtpTarget] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');

  // Dashboard tab state
  const [currentTab, setCurrentTab] = useState<DashboardTab>('home');
  
  // Sub-screen stack state (holds active screen name + params)
  const [activeScreen, setActiveScreen] = useState<{ name: string; params?: any } | null>(null);

  // Older specific sub-screen overlays (kept for compatibility/fallback)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [viewingRevenue, setViewingRevenue] = useState(false);

  // Profile and OTP helper state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'register' | 'reset'>('register');

  // Register global API client logout callback
  useEffect(() => {
    registerLogoutHandler(() => {
      setUserRole(null);
      setUserProfile(null);
      setAppState('login');
      setActiveScreen(null);
    });
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await apiClient.get('/residents/me/profile');
      setUserProfile(res.data);
      setUserRole(res.data.role?.name);
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Setup deep linking
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    const { path, queryParams } = Linking.parse(url);
    if (path === 'reset-password' && queryParams?.token) {
      setResetToken(queryParams.token as string);
      setAppState('reset_password');
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getAccessToken();
        const role = await getUserRole();
        if (token && role) {
          setUserRole(role);
          setAppState('dashboard');
          setCurrentTab('home');
          fetchUserProfile();
        } else {
          setAppState('login');
        }
      } catch (err) {
        console.error('Failed checking session', err);
        setAppState('login');
      }
    }
    if (appState !== 'reset_password') {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (appState === 'dashboard') {
      fetchUserProfile();
    }
  }, [appState]);

  const handleLogout = async () => {
    await deleteTokens();
    setUserRole(null);
    setUserProfile(null);
    setAppState('login');
    setActiveScreen(null);
  };

  const handleLoginSuccess = (role: string) => {
    setUserRole(role);
    setAppState('dashboard');
    setCurrentTab('home');
    fetchUserProfile();
  };

  const handleRegisterSuccess = (target: string) => {
    setOtpTarget(target);
    setOtpPurpose('register');
    setAppState('otp');
  };

  const handleForgotPasswordSuccess = (email: string) => {
    setOtpTarget(email);
    setOtpPurpose('reset');
    setAppState('otp');
  };

  const handleForgotPasswordSuccess = () => {
    setResetToken('');
    setAppState('reset_password');
  };

  const handlePayNow = async (billId: string) => {
    try {
      const response = await apiClient.get(`/bills/${billId}`);
      const bill = response.data;
      setActiveScreen({
        name: 'PayMaintenance',
        params: {
          billId: bill.id,
          amount: bill.amount,
          billNumber: bill.bill_number,
        },
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve bill payment details.');
    }
  };

  if (appState === 'checking') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F6FED" />
      </View>
    );
  }

  const isSuperAdmin = userRole === 'Super Admin';
  const isSocietyAdmin = userRole === 'Society Admin';
  const isCommitteeMember = userRole === 'Committee Member';
  const isManagement = isSuperAdmin || isSocietyAdmin || isCommitteeMember;

  // Render Stack Screen if one is active
  if (appState === 'dashboard' && activeScreen) {
    switch (activeScreen.name) {
      // Resident Screens
      case 'RaiseComplaint':
        return <RaiseComplaintScreen onGoBack={() => setActiveScreen(null)} />;
      case 'MyComplaints':
        return (
          <MyComplaintsScreen
            onGoBack={() => setActiveScreen(null)}
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
          />
        );
      case 'NoticeList':
        return (
          <NoticeListScreen
            onGoBack={() => setActiveScreen(null)}
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
          />
        );
      case 'NoticeDetails':
        return <NoticeDetailsScreen route={{ params: activeScreen.params }} onGoBack={() => setActiveScreen(null)} />;
      case 'EventList':
        return (
          <EventListScreen
            onGoBack={() => setActiveScreen(null)}
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
          />
        );
      case 'EventDetails':
        return <EventDetailsScreen route={{ params: activeScreen.params }} onGoBack={() => setActiveScreen(null)} />;
      case 'FamilyMembers':
        return <FamilyMembersScreen onGoBack={() => setActiveScreen(null)} />;
      case 'Vehicles':
        return <VehiclesScreen onGoBack={() => setActiveScreen(null)} />;
      case 'Notifications':
        return <NotificationsScreen onGoBack={() => setActiveScreen(null)} />;
      case 'PayMaintenance':
        return (
          <PayMaintenanceScreen
            route={{ params: activeScreen.params }}
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
            onGoBack={() => setActiveScreen(null)}
          />
        );
      case 'PaymentSuccess':
        return (
          <PaymentSuccessScreen
            route={{ params: activeScreen.params }}
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
            onNavigateToTab={(tab) => {
              setActiveScreen(null);
              setCurrentTab(tab as any);
            }}
          />
        );
      case 'ReceiptDetail':
        return <ReceiptDetailScreen paymentId={activeScreen.params.paymentId} onGoBack={() => setActiveScreen(null)} />;

      // Admin / Committee Screens
      case 'AdminComplaintsList':
        return (
          <AdminComplaintsListScreen
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
            onGoBack={() => setActiveScreen(null)}
          />
        );
      case 'AdminComplaintDetails':
        return <AdminComplaintDetailsScreen route={{ params: activeScreen.params }} onGoBack={() => setActiveScreen(null)} />;
      case 'NoticeManagement':
        return (
          <NoticeManagementScreen
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
            onGoBack={() => setActiveScreen(null)}
          />
        );
      case 'CreateNotice':
        return <CreateNoticeScreen route={{ params: activeScreen.params }} onGoBack={() => setActiveScreen(null)} />;
      case 'AdminEventList':
        return (
          <AdminEventListScreen
            onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
            onGoBack={() => setActiveScreen(null)}
          />
        );
      case 'CreateEvent':
        return <CreateEventScreen route={{ params: activeScreen.params }} onGoBack={() => setActiveScreen(null)} />;
      case 'ManageRsvps':
        return <ManageRsvpsScreen route={{ params: activeScreen.params }} onGoBack={() => setActiveScreen(null)} />;
      case 'EventGallery':
        return <EventGalleryScreen onGoBack={() => setActiveScreen(null)} />;
      case 'ResidentApprovals':
        return <ResidentApprovalsScreen onGoBack={() => setActiveScreen(null)} />;
      case 'ResidentDirectory':
        return <ResidentDirectoryScreen onGoBack={() => setActiveScreen(null)} />;

      // Super Admin Screens
      case 'SocietyManagement':
        return <SocietyManagementScreen onGoBack={() => setActiveScreen(null)} />;
      case 'SubscriptionManagement':
        return <SubscriptionManagementScreen onGoBack={() => setActiveScreen(null)} />;
      case 'PlatformAnalytics':
        return <PlatformAnalyticsScreen onGoBack={() => setActiveScreen(null)} />;
      case 'RolesPermissions':
        return <RolesPermissionsScreen onGoBack={() => setActiveScreen(null)} />;
      case 'AuditLogs':
        return <AuditLogsScreen onGoBack={() => setActiveScreen(null)} />;
    }
  }

  // Dashboard stack tab view
  if (appState === 'dashboard' && userRole) {
    const hasApprovedResidency = isSuperAdmin || (userProfile?.society_id && userProfile?.approval_status === 'APPROVED');
    const hasPendingResidency = !isSuperAdmin && userProfile?.society_id && userProfile?.approval_status === 'PENDING';
    const hasNoResidency = !isSuperAdmin && !userProfile?.society_id;

    const renderLockedFeature = () => (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔐</Text>
        <Text style={styles.lockedTitle}>Feature Locked</Text>
        <Text style={styles.lockedSubtitle}>
          This feature becomes available after joining or creating a residency.
        </Text>
      </View>
    );

    const renderPendingResidency = () => (
      <View style={styles.pendingContainer}>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeIcon}>⏳</Text>
        </View>
        <Text style={styles.pendingTitle}>Request Pending Approval</Text>
        <Text style={styles.pendingSubtitle}>
          Your request to join the society is pending approval from the Residency Owner.
        </Text>
        <Text style={styles.pendingTip}>
          Once approved, all application modules will unlock automatically.
        </Text>
        
        <TouchableOpacity
          style={styles.cancelRequestButton}
          activeOpacity={0.8}
          onPress={async () => {
            Alert.alert('Cancel Request', 'Are you sure you want to cancel your join request?', [
              { text: 'No' },
              {
                text: 'Yes, Cancel',
                onPress: async () => {
                  try {
                    await apiClient.put('/auth/profile', { society_id: null, flat_id: null });
                    fetchUserProfile();
                  } catch (err) {
                    Alert.alert('Error', 'Failed to cancel request.');
                  }
                }
              }
            ]);
          }}
        >
          <Text style={styles.cancelRequestText}>Cancel Request</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pendingLogoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.pendingLogoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.mainContent}>
          {loadingProfile && !userProfile ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2F6FED" />
            </View>
          ) : (
            <>
              {currentTab === 'home' && (
                hasNoResidency ? (
                  <ResidencyOnboardingScreen onLogout={handleLogout} onRefreshProfile={fetchUserProfile} />
                ) : hasPendingResidency ? (
                  renderPendingResidency()
                ) : (
                  isSuperAdmin ? (
                    <SuperAdminDashboardScreen onNavigateToScreen={(name, params) => setActiveScreen({ name, params })} onLogout={handleLogout} />
                  ) : isManagement ? (
                    <CommitteeDashboardScreen
                      onNavigateToTab={(tab) => setCurrentTab(tab as DashboardTab)}
                      onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
                    />
                  ) : (
                    <ResidentDashboardScreen
                      onNavigateToTab={(tab) => setCurrentTab(tab as DashboardTab)}
                      onNavigateToScreen={(name, params) => setActiveScreen({ name, params })}
                    />
                  )
                )
              )}

              {currentTab === 'bills' && !isSuperAdmin && (
                !hasApprovedResidency ? (
                  renderLockedFeature()
                ) : (
                  selectedBillId ? (
                    <BillDetailsScreen
                      billId={selectedBillId}
                      onGoBack={() => setSelectedBillId(null)}
                      onPayNow={handlePayNow}
                    />
                  ) : (
                    <MyBillsScreen onSelectBill={(id) => setSelectedBillId(id)} />
                  )
                )
              )}

              {currentTab === 'payments' && !isSuperAdmin && (
                !hasApprovedResidency ? (
                  renderLockedFeature()
                ) : (
                  selectedPaymentId ? (
                    <ReceiptDetailScreen
                      paymentId={selectedPaymentId}
                      onGoBack={() => setSelectedPaymentId(null)}
                    />
                  ) : (
                    <PaymentHistoryScreen onSelectPayment={(id) => setSelectedPaymentId(id)} />
                  )
                )
              )}

              {currentTab === 'analytics' && (isSocietyAdmin || isSuperAdmin) && (
                !hasApprovedResidency ? (
                  renderLockedFeature()
                ) : (
                  viewingRevenue ? (
                    <RevenueOverviewScreen onGoBack={() => setViewingRevenue(false)} />
                  ) : (
                    <AdminDashboardScreen onViewRevenue={() => setViewingRevenue(true)} />
                  )
                )
              )}

              {currentTab === 'profile' && (
                <ProfileScreen onLogout={handleLogout} />
              )}
            </>
          )}
        </View>

        {/* Bottom Tab Navigation Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, currentTab === 'home' && styles.tabButtonActive]}
            onPress={() => {
              setCurrentTab('home');
              setSelectedBillId(null);
              setSelectedPaymentId(null);
              setViewingRevenue(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, currentTab === 'home' && styles.tabTextActive]}>Home</Text>
          </TouchableOpacity>

          {!isSuperAdmin && (
            <>
              <TouchableOpacity
                style={[styles.tabButton, currentTab === 'bills' && styles.tabButtonActive]}
                onPress={() => {
                  setCurrentTab('bills');
                  setSelectedBillId(null);
                  setSelectedPaymentId(null);
                  setViewingRevenue(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, currentTab === 'bills' && styles.tabTextActive]}>Bills</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, currentTab === 'payments' && styles.tabButtonActive]}
                onPress={() => {
                  setCurrentTab('payments');
                  setSelectedBillId(null);
                  setSelectedPaymentId(null);
                  setViewingRevenue(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, currentTab === 'payments' && styles.tabTextActive]}>Payments</Text>
              </TouchableOpacity>
            </>
          )}

          {(isSocietyAdmin || isSuperAdmin) && (
            <TouchableOpacity
              style={[styles.tabButton, currentTab === 'analytics' && styles.tabButtonActive]}
              onPress={() => {
                setCurrentTab('analytics');
                setSelectedBillId(null);
                setSelectedPaymentId(null);
                setViewingRevenue(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, currentTab === 'analytics' && styles.tabTextActive]}>Admin</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tabButton, currentTab === 'profile' && styles.tabButtonActive]}
            onPress={() => {
              setCurrentTab('profile');
              setSelectedBillId(null);
              setSelectedPaymentId(null);
              setViewingRevenue(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, currentTab === 'profile' && styles.tabTextActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Navigation flow switcher
  switch (appState) {
    case 'register':
      return (
        <>
          <RegisterScreen
            apiBaseUrl={API_BASE_URL}
            onRegisterSuccess={handleRegisterSuccess}
            onNavigateToLogin={() => setAppState('login')}
          />
          <StatusBar style="auto" />
        </>
      );
    case 'otp':
      return (
        <>
          <OtpVerificationScreen
            apiBaseUrl={API_BASE_URL}
            target={otpTarget}
            purpose={otpPurpose}
            onVerificationSuccess={async (token, access_token, refresh_token, role) => {
              if (otpPurpose === 'reset') {
                setResetToken(token || '');
                setAppState('reset_password');
              } else {
                // Auto login on successful register
                if (access_token && refresh_token && role) {
                  await saveTokens(access_token, refresh_token);
                  setUserRole(role);
                  setAppState('dashboard');
                  setCurrentTab('home');
                } else {
                  setAppState('login');
                }
              }
            }}
            onNavigateBack={() => {
              if (otpPurpose === 'reset') {
                setAppState('forgot_password');
              } else {
                setAppState('register');
              }
            }}
          />
          <StatusBar style="auto" />
        </>
      );
    case 'forgot_password':
      return (
        <>
          <ForgotPasswordScreen
            apiBaseUrl={API_BASE_URL}
            onSuccess={handleForgotPasswordSuccess}
            onNavigateToLogin={() => setAppState('login')}
          />
          <StatusBar style="auto" />
        </>
      );
    case 'reset_password':
      return (
        <>
          <ResetPasswordScreen
            apiBaseUrl={API_BASE_URL}
            initialToken={resetToken}
            onSuccess={() => setAppState('login')}
            onNavigateBack={() => setAppState('forgot_password')}
          />
          <StatusBar style="auto" />
        </>
      );
    case 'login':
    default:
      return (
        <>
          <LoginScreen
            apiBaseUrl={API_BASE_URL}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setAppState('register')}
            onNavigateToForgotPassword={() => setAppState('forgot_password')}
          />
          <StatusBar style="auto" />
        </>
      );
  }
}



export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
