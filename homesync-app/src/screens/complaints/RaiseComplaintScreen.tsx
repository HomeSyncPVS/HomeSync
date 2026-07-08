import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Priority = 'Low' | 'Medium' | 'High';

const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Security'];

export function RaiseComplaintScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, radius } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [location, setLocation] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const isValid = title.trim().length > 0 && description.trim().length > 0 && category !== null && location.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Missing Fields', 'Please fill out all fields before submitting.');
      return;
    }

    try {
      // Simulated POST /complaints/
      await new Promise((resolve) => setTimeout(resolve, 500));
      Alert.alert('Success', 'Complaint ticket raised successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit complaint ticket.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Raise Complaint" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 100 }}>
        
        {/* Title details */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Complaint Title</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="e.g. Kitchen sink water seepage"
            placeholderTextColor={colors.outline}
            value={title}
            onChangeText={setTitle}
          />
        </Card>

        {/* Category selector */}
        <Card style={StyleSheet.flatten([styles.formCard, { zIndex: 30 }])}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Category</Text>
          <TouchableOpacity
            style={[styles.selector, { borderColor: colors.outlineVariant, borderRadius: radius.md }]}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <Text style={{ color: category ? colors.onSurface : colors.outline }}>
              {category || 'Select category...'}
            </Text>
            <MaterialIcons name={showCategoryDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={colors.onSurface} />
          </TouchableOpacity>
          {showCategoryDropdown && (
            <View style={[styles.dropdownOptions, { borderColor: colors.outlineVariant, backgroundColor: colors.surface, borderRadius: radius.md }]}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.dropdownOpt, { borderBottomColor: colors.outlineVariant }]}
                  onPress={() => {
                    setCategory(c);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={{ color: colors.onSurface, fontWeight: '500' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Priority Level */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Priority Level</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md }]}>
            {(['Low', 'Medium', 'High'] as Priority[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[styles.segment, priority === p && { backgroundColor: colors.primary, borderRadius: radius.md - 4 }]}
              >
                <Text style={{ color: priority === p ? '#FFFFFF' : colors.onSurfaceVariant, fontWeight: '700', fontSize: 13 }}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Location within flat */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Location</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="e.g. Master Bedroom, Balcony, Kitchen"
            placeholderTextColor={colors.outline}
            value={location}
            onChangeText={setLocation}
          />
        </Card>

        {/* Description detail */}
        <Card style={styles.formCard}>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.outlineVariant, color: colors.onSurface, borderRadius: radius.md }]}
            placeholder="Detail the issue to help our team address it..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={5}
            value={description}
            onChangeText={setDescription}
          />
        </Card>

      </ScrollView>

      {/* Footer trigger */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isValid ? colors.primary : colors.outlineVariant, borderRadius: radius.md }]}
          onPress={handleSubmit}
          disabled={!isValid}
        >
          <MaterialIcons name="send" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>Raise Complaint</Text>
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
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textArea: {
    minHeight: 120,
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
