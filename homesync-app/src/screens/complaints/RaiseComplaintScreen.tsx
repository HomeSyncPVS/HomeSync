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
  const { colors, spacing } = useTheme();
  const [category, setCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [photos, setPhotos] = useState<string[]>([]); // placeholder URIs once expo-image-picker is wired up

  const isValid = category !== null && description.trim().length > 0;

  function handleSubmit() {
    if (!isValid) {
      Alert.alert('Missing details', 'Please select a category and add a description before submitting.');
      return;
    }
    // TODO: wire to POST /complaints once backend is live (multipart with photos)
    navigation.goBack();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Raise Complaint" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.md, paddingBottom: 120 }}>
        <Card>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.categoryChip,
                  { borderColor: colors.outlineVariant, backgroundColor: category === c ? colors.primary : colors.surface },
                ]}
              >
                <Text style={{ color: category === c ? '#FFFFFF' : colors.onSurface, fontSize: 13, fontWeight: '600' }}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.onSurfaceVariant, marginTop: 16 }]}>Sub-category</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface }]}
            placeholder="e.g. Leaking Faucet"
            placeholderTextColor={colors.outline}
            value={subCategory}
            onChangeText={setSubCategory}
          />
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.outlineVariant, color: colors.onSurface }]}
            placeholder="Provide details about the issue to help our technician..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={5}
            value={description}
            onChangeText={setDescription}
          />
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Priority Level</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceContainerLow }]}>
            {(['Low', 'Medium', 'High'] as Priority[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[styles.segment, priority === p && { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: priority === p ? '#FFFFFF' : colors.onSurfaceVariant, fontWeight: '700', fontSize: 13 }}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Evidence Photos (Max 5)</Text>
          <View style={styles.photoGrid}>
            <TouchableOpacity
              style={[styles.addPhotoBox, { borderColor: colors.primary }]}
              onPress={() =>
                photos.length < 5 && setPhotos((p) => [...p, `placeholder-${p.length}`])
              }
            >
              <MaterialIcons name="photo-camera" size={22} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 }}>ADD</Text>
            </TouchableOpacity>
            {photos.map((p, i) => (
              <View key={p} style={[styles.photoThumb, { backgroundColor: colors.surfaceContainerHigh }]}>
                <TouchableOpacity
                  style={[styles.removePhoto, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                  onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <MaterialIcons name="close" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isValid ? colors.primary : colors.outlineVariant }]}
          onPress={handleSubmit}
        >
          <MaterialIcons name="send" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>Submit Complaint</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  textArea: { minHeight: 100, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, textAlignVertical: 'top' },
  segmentedControl: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  photoGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addPhotoBox: { width: 64, height: 64, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoThumb: { width: 64, height: 64, borderRadius: 12 },
  removePhoto: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  submitButton: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
