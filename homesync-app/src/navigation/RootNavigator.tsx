import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SplashScreen } from '../screens/auth/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpVerifyScreen } from '../screens/auth/OtpVerifyScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ResidentTabs } from './ResidentTabs';
import { PaymentHistoryScreen } from '../screens/bills/PaymentHistoryScreen';
import { PaymentSuccessScreen } from '../screens/bills/PaymentSuccessScreen';
import { ComplaintsListScreen } from '../screens/complaints/ComplaintsListScreen';
import { RaiseComplaintScreen } from '../screens/complaints/RaiseComplaintScreen';
import { ComplaintDetailScreen } from '../screens/complaints/ComplaintDetailScreen';
import { EventDetailScreen } from '../screens/events/EventDetailScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { ResidentApprovalsScreen } from '../screens/admin/ResidentApprovalsScreen';
import { NoticeDetailScreen } from '../screens/notices/NoticeDetailScreen';
import { NoticeCreateEditScreen } from '../screens/notices/NoticeCreateEditScreen';
import { EventCreateEditScreen } from '../screens/events/EventCreateEditScreen';
import { SuperAdminDashboardScreen } from '../screens/admin/SuperAdminDashboardScreen';
import { SettingsScreen } from '../screens/home/SettingsScreen';
import { AuditLogsScreen } from '../screens/admin/AuditLogsScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { ReportsSummaryScreen } from '../screens/admin/ReportsSummaryScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OtpVerify: { phone: string; role?: string };
  Signup: undefined;
  ResidentTabs: undefined;
  PaymentHistory: undefined;
  PaymentSuccess: { amount: number; transactionId: string };
  ComplaintsList: undefined;
  RaiseComplaint: undefined;
  ComplaintDetail: { complaintId: string };
  EventDetail: { eventId: string };
  AdminDashboard: undefined;
  ResidentApprovals: undefined;
  NoticeDetail: { noticeId: string };
  NoticeCreateEdit: { noticeId?: string };
  EventCreateEdit: { eventId?: string };
  SuperAdminDashboard: undefined;
  Settings: undefined;
  AuditLogs: undefined;
  Notifications: undefined;
  ReportsSummary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ResidentTabs" component={ResidentTabs} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        <Stack.Screen name="ComplaintsList" component={ComplaintsListScreen} />
        <Stack.Screen name="RaiseComplaint" component={RaiseComplaintScreen} />
        <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="ResidentApprovals" component={ResidentApprovalsScreen} />
        <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
        <Stack.Screen name="NoticeCreateEdit" component={NoticeCreateEditScreen} />
        <Stack.Screen name="EventCreateEdit" component={EventCreateEditScreen} />
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AuditLogs" component={AuditLogsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ReportsSummary" component={ReportsSummaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
