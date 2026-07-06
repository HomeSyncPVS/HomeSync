import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

export function ProfileScreen() {
  const { colors, spacing, isDark, mode, setMode } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Profile" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md }}>
        <Card>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 18 }}>JD</Text>
            </View>
            <View>
              <Text style={{ color: colors.onSurface, fontWeight: '700', fontSize: 16 }}>Jane Doe</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>B-402 · Resident</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: mode === m ? colors.primary : colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                <MaterialIcons
                  name={m === 'light' ? 'light-mode' : m === 'dark' ? 'dark-mode' : 'settings-suggest'}
                  size={18}
                  color={mode === m ? '#FFFFFF' : colors.onSurfaceVariant}
                />
                <Text style={{ color: mode === m ? '#FFFFFF' : colors.onSurfaceVariant, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          {[
            { icon: 'family-restroom' as const, label: 'Family Members' },
            { icon: 'directions-car' as const, label: 'Vehicles' },
            { icon: 'emergency' as const, label: 'Emergency Contacts' },
            { icon: 'notifications' as const, label: 'Notification Preferences' },
            { icon: 'logout' as const, label: 'Log Out' },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }]}
            >
              <MaterialIcons name={item.icon} size={20} color={colors.onSurfaceVariant} />
              <Text style={{ color: colors.onSurface, fontSize: 15, flex: 1 }}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.outlineVariant} />
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
});
