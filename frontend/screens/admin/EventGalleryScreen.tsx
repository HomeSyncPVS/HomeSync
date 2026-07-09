import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Alert } from 'react-native';

interface EventGalleryScreenProps {
  onGoBack: () => void;
}

export default function EventGalleryScreen({ onGoBack }: EventGalleryScreenProps) {
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500',
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=500',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
  ]);

  const handleUpload = () => {
    Alert.alert(
      'BETA FEATURE REQUEST',
      'The Event Gallery schema is currently unconfirmed in the backend database.\n\nUploading new images will be supported once the backend supports gallery image storage.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <Text style={styles.backButtonText}>❮ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Gallery</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.badgeBanner}>
        <Text style={styles.badgeText}>BETA / MOCK MODE ACTIVE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titleText}>Event Memories</Text>
        <Text style={styles.subtitleText}>Pictures uploaded by society members and admins.</Text>

        <View style={styles.grid}>
          {images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.galleryImage} />
          ))}
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Text style={styles.uploadButtonText}>📷 Upload Photo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  galleryImage: {
    width: '48%',
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  uploadButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadButtonText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
