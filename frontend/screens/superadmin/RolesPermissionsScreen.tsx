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
import { superadminApi, RolePermissions } from '../../api/superadmin.mock';

interface RolesPermissionsScreenProps {
  onGoBack: () => void;
}

export default function RolesPermissionsScreen({
  onGoBack,
}: RolesPermissionsScreenProps) {
  const [matrix, setMatrix] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatrix = async () => {
    try {
      const data = await superadminApi.getPermissionsMatrix();
      setMatrix(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleToggle = (role: string, permissionName: string, currentValue: boolean) => {
    Alert.alert(
      'Update Permission',
      `Change '${permissionName}' for '${role}' to ${!currentValue ? 'ENABLED' : 'DISABLED'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setLoading(true);
            try {
              await superadminApi.updatePermissions(role, permissionName, !currentValue);
              fetchMatrix();
            } catch (err: any) {
              Alert.alert('Error', err.message);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RolePermissions }) => {
    const perms = Object.keys(item.permissions);
    
    return (
      <View style={styles.card}>
        <Text style={styles.roleTitle}>{item.role}</Text>
        <View style={styles.divider} />
        {perms.map((p) => {
          const val = item.permissions[p];
          return (
            <View key={p} style={styles.permRow}>
              <Text style={styles.permText}>{p}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, val ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => handleToggle(item.role, p, val)}
              >
                <Text style={[styles.toggleBtnText, val ? styles.toggleActiveText : styles.toggleInactiveText]}>
                  {val ? 'Enabled' : 'Disabled'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Console</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Roles & Permissions</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FED" />
        </View>
      ) : (
        <FlatList
          data={matrix}
          keyExtractor={(item) => item.role}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  permText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  toggleActive: {
    backgroundColor: '#E8FDF3',
  },
  toggleInactive: {
    backgroundColor: '#FFECEF',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  toggleActiveText: {
    color: '#34B37A',
  },
  toggleInactiveText: {
    color: '#E5484D',
  },
});
