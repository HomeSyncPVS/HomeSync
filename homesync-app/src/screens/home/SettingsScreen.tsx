import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

export function SettingsScreen() {
  const { colors, spacing, radius } = useTheme();

  // Mock states representing profile and society context
  const [profile, setProfile] = useState({
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@homesync.com',
  });

  const [society, setSociety] = useState({
    name: 'Green Valley Heights',
    address: 'Sector 15, Dwarka, New Delhi - 110075',
    logoUrl: 'https://via.placeholder.com/150.png?text=GV+Logo',
    bannerUrl: 'https://via.placeholder.com/600x200.png?text=Green+Valley+Heights+Banner',
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          // Simulated POST /auth/logout
          Alert.alert('Logged Out', 'You have been successfully logged out.');
        },
      },
    ]);
  };

  const triggerAction = (actionName: string) => {
    Alert.alert(actionName, `Entering ${actionName.toLowerCase()} settings panel.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Settings" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 60 }}>
        
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.onSurface }]}>{profile.name}</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginTop: 2 }}>{profile.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => triggerAction('Edit Profile')} style={[styles.editIconBtn, { borderColor: colors.outlineVariant, borderRadius: radius.sm }]}>
              <MaterialIcons name="edit" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Settings Group Lists */}
        <Card style={{ padding: spacing.xs }}>
          <TouchableOpacity style={styles.settingRow} onPress={() => triggerAction('Change Password')}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '1A' }]}>
              <MaterialIcons name="lock-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
          </TouchableOpacity>
        </Card>

        {/* Society Branding details */}
        <Card style={styles.societyCard}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>Society Branding</Text>
          
          <View style={styles.societyBrandingInfo}>
            <Text style={[styles.societyName, { color: colors.onSurface }]}>{society.name}</Text>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>{society.address}</Text>
          </View>

          {/* Logo asset */}
          <View style={styles.assetBlock}>
            <Text style={[styles.assetLabel, { color: colors.outline }]}>Society Logo</Text>
            <View style={styles.assetRow}>
              <Image source={{ uri: society.logoUrl }} style={[styles.logoThumb, { borderRadius: radius.md }]} resizeMode="contain" />
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: colors.primary, borderRadius: radius.sm }]}
                onPress={() => triggerAction('Upload Logo')}
              >
                <MaterialIcons name="upload" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Change Logo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner asset */}
          <View style={styles.assetBlock}>
            <Text style={[styles.assetLabel, { color: colors.outline }]}>Society Banner</Text>
            <View style={styles.bannerContainer}>
              <Image source={{ uri: society.bannerUrl }} style={[styles.bannerThumb, { borderRadius: radius.md }]} resizeMode="cover" />
            </View>
            <TouchableOpacity
              style={[styles.uploadBtn, { borderColor: colors.primary, borderRadius: radius.sm, alignSelf: 'flex-start', marginTop: 8 }]}
              onPress={() => triggerAction('Upload Banner')}
            >
              <MaterialIcons name="image" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Change Banner</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Logout container */}
        <Card style={{ padding: spacing.xs }}>
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <View style={[styles.iconBox, { backgroundColor: colors.error + '1A' }]}>
              <MaterialIcons name="logout" size={20} color={colors.error} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.error, fontWeight: '700' }]}>Logout</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  profileName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  societyCard: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  societyBrandingInfo: {
    marginBottom: 16,
  },
  societyName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  assetBlock: {
    gap: 8,
    marginBottom: 16,
  },
  assetLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoThumb: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: '#EFF4FF',
  },
  bannerContainer: {
    width: '100%',
    height: 90,
  },
  bannerThumb: {
    width: '100%',
    height: '100%',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
});
