import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'NoticeDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface NoticeDetail {
  id: string;
  title: string;
  body: string;
  type: string;
  targetGroup: string;
  expiryDate: string;
  attachmentUrl?: string;
  datePosted: string;
}

export function NoticeDetailScreen() {
  const route = useRoute<Rt>();
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Mock admin authorization
  const [notice, setNotice] = useState<NoticeDetail | null>(null);

  const fetchNoticeDetails = async (id: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Simulated GET /notices/{id}
      setNotice({
        id,
        title: 'Emergency Water Tank Cleaning',
        body: 'Water supply to all blocks will be temporarily shut off tomorrow from 9:00 AM to 1:00 PM for scheduled cleaning of the overhead tanks. Please store enough water for your daily activities beforehand to avoid inconvenience. Thank you for your cooperation.',
        type: 'Emergency',
        targetGroup: 'All Blocks',
        expiryDate: 'Jul 10, 2026',
        attachmentUrl: 'https://example.com/cleaning_schedule.pdf',
        datePosted: 'Today, 10:00 AM',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to retrieve notice details.');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNoticeDetails(route.params.noticeId).then(() => setLoading(false));
  }, [route.params.noticeId]);

  const handleDelete = async () => {
    Alert.alert('Delete Notice', 'Are you sure you want to permanently delete this notice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Simulated DELETE /notices/{id}
            await new Promise((resolve) => setTimeout(resolve, 400));
            Alert.alert('Success', 'Notice deleted successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete notice.');
          }
        },
      },
    ]);
  };

  const handleOpenAttachment = () => {
    if (notice?.attachmentUrl) {
      Linking.openURL(notice.attachmentUrl).catch(() =>
        Alert.alert('Error', 'Cannot open file URL.')
      );
    }
  };

  if (loading || !notice) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Notice Details" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md }}>
        <Card style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: colors.error + '1A' }]}>
              <Text style={[styles.badgeText, { color: colors.error }]}>{notice.type}</Text>
            </View>
            <Text style={{ color: colors.outline, fontSize: 12 }}>{notice.datePosted}</Text>
          </View>

          <Text style={[styles.noticeTitle, { color: colors.onSurface }]}>{notice.title}</Text>
          
          <Text style={[styles.noticeBody, { color: colors.onSurfaceVariant }]}>{notice.body}</Text>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          {/* Properties lists */}
          <View style={styles.propsContainer}>
            <View style={styles.propItem}>
              <Text style={[styles.propLabel, { color: colors.outline }]}>Audience Target</Text>
              <Text style={[styles.propVal, { color: colors.onSurface }]}>{notice.targetGroup}</Text>
            </View>
            <View style={styles.propItem}>
              <Text style={[styles.propLabel, { color: colors.outline }]}>Expiration Date</Text>
              <Text style={[styles.propVal, { color: colors.onSurface }]}>{notice.expiryDate}</Text>
            </View>
          </View>

          {notice.attachmentUrl && (
            <TouchableOpacity
              style={[styles.attachmentBox, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}
              onPress={handleOpenAttachment}
            >
              <MaterialIcons name="attachment" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  View Attached Notice File
                </Text>
                <Text style={{ color: colors.outline, fontSize: 11, marginTop: 2 }}>
                  PDF Document
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Admin Controls */}
        {isAdmin && (
          <View style={styles.adminActionRow}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
              onPress={() => navigation.navigate('NoticeCreateEdit', { noticeId: notice.id })}
            >
              <MaterialIcons name="edit" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Edit Notice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.error, borderRadius: radius.md }]}
              onPress={handleDelete}
            >
              <MaterialIcons name="delete" size={18} color={colors.error} />
              <Text style={[styles.buttonText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noticeTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  noticeBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  propsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  propItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  propLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
  propVal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  adminActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1.5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
