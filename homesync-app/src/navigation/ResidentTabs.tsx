import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import { HomeScreen } from '../screens/home/HomeScreen';
import { CurrentBillScreen } from '../screens/bills/CurrentBillScreen';
import { NoticesScreen } from '../screens/notices/NoticesScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { ProfileScreen } from '../screens/home/ProfileScreen';

export type ResidentTabParamList = {
  Home: undefined;
  Bills: undefined;
  Notices: undefined;
  Events: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<ResidentTabParamList>();

const ICONS: Record<keyof ResidentTabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'home',
  Bills: 'payments',
  Notices: 'campaign',
  Events: 'event',
  Profile: 'person',
};

export function ResidentTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={ICONS[route.name as keyof ResidentTabParamList]} size={size ?? 24} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bills" component={CurrentBillScreen} />
      <Tab.Screen name="Notices" component={NoticesScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
