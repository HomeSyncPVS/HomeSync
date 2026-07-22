import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../utils/api';

interface AdBannerProps {
  placement?: 'banner' | 'native';
}

export default function AdBanner({ placement = 'banner' }: AdBannerProps) {
  const [adLevel, setAdLevel] = useState<string>('Free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdLevel() {
      try {
        const res = await apiClient.get('/subscriptions/current');
        setAdLevel(res.data.ad_level || 'Free');
      } catch (err) {
        setAdLevel('Free');
      } finally {
        setLoading(false);
      }
    }
    checkAdLevel();
  }, []);

  // Enterprise tier is completely ad-free
  if (loading || adLevel === 'Ad-Free' || adLevel === 'Enterprise') {
    return null;
  }

  return (
    <View style={styles.adContainer}>
      <Text style={styles.adTag}>SPONSORED ADVERTISEMENT</Text>
      <View style={styles.adBox}>
        <Text style={styles.adTitle}>HomeSync Smart Security & Insurance 🛡️</Text>
        <Text style={styles.adDescription}>Protect your home and family with 24/7 AI society monitoring.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adContainer: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  adTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  adBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  adDescription: {
    fontSize: 12,
    color: '#64748B',
  },
});
