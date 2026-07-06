import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="upload" size={48} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>HomeSync</Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>Your society, simplified</Text>
      </View>

      <View style={{ paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.sm }}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Login')}
        >
          <MaterialIcons name="smartphone" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Login with Phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Login')}
        >
          <MaterialIcons name="mail" size={20} color={colors.primary} />
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Login with Email</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.outline }]}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoBox: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16 },
  primaryButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
  footerText: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
