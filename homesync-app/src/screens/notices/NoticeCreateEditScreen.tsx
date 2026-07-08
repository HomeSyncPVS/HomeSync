import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Rt = RouteProp<RootStackParamList, 'NoticeCreateEdit'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const TYPES = ['Emergency', 'General', 'Event', 'Maintenance'];

export function NoticeCreateEditScreen() {
  const route = useRoute<Rt>();
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();

  const noticeId = route.params?.noticeId;
  const isEditMode = !!noticeId;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [targetGroup, setTargetGroup] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      // Mock loading notice values for edit
      setTitle('Emergency Water Tank Cleaning');
      setBody('Water supply to all blocks will be temporarily shut off tomorrow from 9:00 AM to 1:00 PM for scheduled cleaning of the overhead tanks.');
      setType('Emergency');
      setTargetGroup('All Blocks');
      setExpiryDate('2026-07-10');
      setAttachmentUrl('https://example.com/cleaning_schedule.pdf');
    }
  }, [noticeId]);

  const isValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    type !== null &&
    targetGroup.trim().length > 0 &&
    expiryDate.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    try {
      if (isEditMode) {
        // Simulated PUT /notices/{id}
        await new Promise((resolve) => setTimeout(resolve, 500));
        Alert.alert('Success', 'Notice updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Simulated POST /notices/
        await new Promise((resolve) => setTimeout(resolve, 500));
        Alert.alert('Success', 'Notice published successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save notice.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={isEditMode ? 'Edit Notice' : 'Create Notice'} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}>
        
        {/* Title */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Notice Title *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="e.g. Annual General Meeting"
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={setTitle}
          />
        </Card>

        {/* Notice Type Dropdown */}
        <Card style={StyleSheet.flatten([styles.formCard, { zIndex: 30 }])}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Notice Type *</Text>
          <TouchableOpacity
            style={[styles.selector, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}
            onPress={() => setShowTypeDropdown(!showTypeDropdown)}
          >
            <Text style={{ color: type ? colors.onSurface : colors.outline }}>
              {type || 'Select notice type...'}
            </Text>
            <MaterialIcons name={showTypeDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={colors.onSurface} />
          </TouchableOpacity>
          {showTypeDropdown && (
            <View style={[styles.dropdownOptions, { borderColor: colors.outlineVariant, backgroundColor: colors.surface, borderRadius: radius.md }]}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.dropdownOpt, { borderBottomColor: colors.outlineVariant }]}
                  onPress={() => {
                    setType(t);
                    setShowTypeDropdown(false);
                  }}
                >
                  <Text style={{ color: colors.onSurface, fontWeight: '500' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Target Audience / Group */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Target Audience Group *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="e.g. All Blocks, Tower B, Committee Owners"
            placeholderTextColor={colors.outline}
            value={targetGroup}
            onChangeText={setTargetGroup}
          />
        </Card>

        {/* Expiry Date input */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Expiry Date *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.outline}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        </Card>

        {/* Attachment URL */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Attachment File URL (Optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="https://example.com/file.pdf"
            placeholderTextColor={colors.outline}
            value={attachmentUrl}
            onChangeText={setAttachmentUrl}
          />
        </Card>

        {/* Full content body */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Body Details *</Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="Provide full description of the notice..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={6}
            value={body}
            onChangeText={setBody}
          />
        </Card>

      </ScrollView>

      {/* Trigger Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isValid ? colors.primary : colors.outlineVariant, borderRadius: radius.md }]}
          onPress={handleSubmit}
          disabled={!isValid}
        >
          <MaterialIcons name="done" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isEditMode ? 'Update Notice' : 'Publish Notice'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    padding: 16,
    position: 'relative',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 76,
    left: 16,
    right: 16,
    borderWidth: 1,
    zIndex: 40,
    overflow: 'hidden',
  },
  dropdownOpt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  textArea: {
    minHeight: 140,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
