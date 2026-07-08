import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: 'Auth' | 'Complaints' | 'Notices' | 'Events' | 'Billing' | 'Residents';
  details: string;
  ipAddress: string;
}

interface GroupedLogs {
  date: string;
  logs: AuditLog[];
}

export function AuditLogsScreen() {
  const { colors, spacing, radius } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('All');

  // Mocked Audit Logs list grouped by date
  const groupedLogs: GroupedLogs[] = [
    {
      date: 'Today - July 8, 2026',
      logs: [
        {
          id: 'log-1',
          timestamp: '11:42 AM',
          user: 'Rajesh Kumar (Admin)',
          action: 'Approve Resident registration',
          module: 'Residents',
          details: 'Approved signup request for Aman Gupta (B-402, Resident).',
          ipAddress: '192.168.1.104',
        },
        {
          id: 'log-2',
          timestamp: '10:15 AM',
          user: 'Rajesh Kumar (Admin)',
          action: 'Publish Emergency Notice',
          module: 'Notices',
          details: 'Posted notice "Emergency Water Tank Cleaning" with expiry date Jul 10.',
          ipAddress: '192.168.1.104',
        },
      ],
    },
    {
      date: 'Yesterday - July 7, 2026',
      logs: [
        {
          id: 'log-3',
          timestamp: '04:30 PM',
          user: 'System Cron',
          action: 'Generate Monthly Maintenance Bills',
          module: 'Billing',
          details: 'Automatically generated July maintenance bills for 340 flats.',
          ipAddress: 'localhost',
        },
        {
          id: 'log-4',
          timestamp: '02:10 PM',
          user: 'Sana Khan (Resident)',
          action: 'Submit new Complaint ticket',
          module: 'Complaints',
          details: 'Raised complaint CMP-5103 for plumbing leakage in balcony.',
          ipAddress: '172.16.42.8',
        },
      ],
    },
  ];

  const modules = ['All', 'Auth', 'Complaints', 'Notices', 'Events', 'Billing', 'Residents'];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getModuleIcon = (mod: string): keyof typeof MaterialIcons.glyphMap => {
    switch (mod) {
      case 'Auth': return 'vpn-key';
      case 'Complaints': return 'report-problem';
      case 'Notices': return 'campaign';
      case 'Events': return 'event';
      case 'Billing': return 'receipt-long';
      case 'Residents': return 'people';
      default: return 'info-outline';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Audit Logs" showBack={true} rightIcon="filter-list" onRightPress={() => setShowFilterSheet(true)} />

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.lg, paddingBottom: 60 }}>
        
        {/* API warning box */}
        <Card style={{ backgroundColor: colors.primary + '0A', borderColor: colors.primary + '33', borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <MaterialIcons name="warning" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Technical Warning</Text>
          </View>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            Audit Log tracking is not currently wired in the backend routing modules. Designed using mock objects. API integration is requested.
          </Text>
        </Card>

        {/* Date groups */}
        {groupedLogs.map((group) => {
          // Filter logs client-side if a module filter is active
          const filteredLogs = group.logs.filter(
            (l) => selectedModule === 'All' || l.module === selectedModule
          );

          if (filteredLogs.length === 0) return null;

          return (
            <View key={group.date} style={{ gap: spacing.sm }}>
              <Text style={[styles.dateTitle, { color: colors.outline }]}>{group.date}</Text>
              
              <Card style={{ padding: spacing.xs }}>
                {filteredLogs.map((log, idx) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <TouchableOpacity
                      key={log.id}
                      activeOpacity={0.9}
                      onPress={() => toggleExpand(log.id)}
                    >
                      <View
                        style={[
                          styles.logRow,
                          idx < filteredLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
                        ]}
                      >
                        <View style={[styles.moduleIconBox, { backgroundColor: colors.primary + '1A' }]}>
                          <MaterialIcons name={getModuleIcon(log.module)} size={18} color={colors.primary} />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={styles.logHeader}>
                            <Text style={[styles.logAction, { color: colors.onSurface }]} numberOfLines={1}>
                              {log.action}
                            </Text>
                            <Text style={[styles.logTime, { color: colors.outline }]}>{log.timestamp}</Text>
                          </View>
                          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>{log.user}</Text>

                          {isExpanded && (
                            <View style={[styles.expandedArea, { borderTopColor: colors.outlineVariant }]}>
                              <Text style={[styles.detailLabel, { color: colors.outline }]}>Details</Text>
                              <Text style={[styles.detailText, { color: colors.onSurface }]}>{log.details}</Text>

                              <View style={styles.propRow}>
                                <Text style={[styles.detailLabel, { color: colors.outline }]}>IP Address</Text>
                                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{log.ipAddress}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Sheet Filter Modal */}
      <Modal
        visible={showFilterSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Filter Audit Logs</Text>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterGroupLabel, { color: colors.outline }]}>Module Type</Text>
            <View style={styles.chipsRow}>
              {modules.map((m) => {
                const isSelected = selectedModule === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderRadius: radius.md,
                      },
                    ]}
                    onPress={() => {
                      setSelectedModule(m);
                      setShowFilterSheet(false);
                    }}
                  >
                    <Text style={{ color: isSelected ? '#FFFFFF' : colors.onSurfaceVariant, fontSize: 13, fontWeight: '600' }}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logAction: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  logTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  expandedArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  detailLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  propRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  filterGroupLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
