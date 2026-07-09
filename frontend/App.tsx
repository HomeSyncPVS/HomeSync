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

import { getAccessToken, getUserRole, deleteTokens } from './utils/storage';
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

  // Register global API client logout callback
  useEffect(() => {
    registerLogoutHandler(() => {
      setUserRole(null);
      setAppState('login');
      setActiveScreen(null);
    });
  }, []);

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

  const handleLogout = async () => {
    await deleteTokens();
    setUserRole(null);
    setAppState('login');
    setActiveScreen(null);
  };

  const handleLoginSuccess = (role: string) => {
    setUserRole(role);
    setAppState('dashboard');
    setCurrentTab('home');
  };

  const handleRegisterSuccess = (target: string) => {
    setOtpTarget(target);
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
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.mainContent}>
          {currentTab === 'home' && (
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
          )}

          {currentTab === 'bills' && !isSuperAdmin && (
            selectedBillId ? (
              <BillDetailsScreen
                billId={selectedBillId}
                onGoBack={() => setSelectedBillId(null)}
                onPayNow={handlePayNow}
              />
            ) : (
              <MyBillsScreen onSelectBill={(id) => setSelectedBillId(id)} />
            )
          )}

          {currentTab === 'payments' && !isSuperAdmin && (
            selectedPaymentId ? (
              <ReceiptDetailScreen
                paymentId={selectedPaymentId}
                onGoBack={() => setSelectedPaymentId(null)}
              />
            ) : (
              <PaymentHistoryScreen onSelectPayment={(id) => setSelectedPaymentId(id)} />
            )
          )}

          {currentTab === 'analytics' && (isSocietyAdmin || isSuperAdmin) && (
            viewingRevenue ? (
              <RevenueOverviewScreen onGoBack={() => setViewingRevenue(false)} />
            ) : (
              <AdminDashboardScreen onViewRevenue={() => setViewingRevenue(true)} />
            )
          )}

          {currentTab === 'profile' && (
            <ProfileScreen onLogout={handleLogout} />
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
            onVerificationSuccess={() => setAppState('login')}
            onNavigateBack={() => setAppState('register')}
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
