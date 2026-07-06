import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Resident' | 'Admin'>('Resident');

  const isValid = phone.length === 10;

  function handleSendOtp() {
    if (!isValid) return;
    // TODO: wire to POST /auth/send-otp once backend is live
    navigation.navigate('OtpVerify', { phone, role });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="HomeSync" />
      <View style={{ padding: spacing.containerMargin, flex: 1 }}>
        <Text style={[styles.heading, { color: colors.onSurface }]}>Enter Phone Number</Text>
        <Text style={[styles.subheading, { color: colors.onSurfaceVariant }]}>
          We will send a 6-digit OTP to verify your account
        </Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              {
                borderColor: role === 'Resident' ? colors.primary : colors.outlineVariant,
                backgroundColor: role === 'Resident' ? colors.surfaceContainer : colors.surface,
              }
            ]}
            onPress={() => setRole('Resident')}
          >
            <Text style={{ color: role === 'Resident' ? colors.primaryContainer : colors.onSurface, fontWeight: '700', fontSize: 13 }}>
              Resident Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              {
                borderColor: role === 'Admin' ? colors.primary : colors.outlineVariant,
                backgroundColor: role === 'Admin' ? colors.surfaceContainer : colors.surface,
              }
            ]}
            onPress={() => setRole('Admin')}
          >
            <Text style={{ color: role === 'Admin' ? colors.primaryContainer : colors.onSurface, fontWeight: '700', fontSize: 13 }}>
              Admin/Committee Login
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Phone Number</Text>
        <View style={[styles.inputRow, { borderColor: colors.outlineVariant, backgroundColor: colors.surface }]}>
          <View style={[styles.countryCode, { borderRightColor: colors.outlineVariant }]}>
            <Text style={{ color: colors.onSurface, fontWeight: '600' }}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[styles.input, { color: colors.onSurface }]}
            placeholder="98765 43210"
            placeholderTextColor={colors.outline}
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: isValid ? colors.primary : colors.outlineVariant }]}
          onPress={handleSendOtp}
          disabled={!isValid}
        >
          <Text style={styles.sendButtonText}>Send OTP</Text>
          <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.securityBadge, { backgroundColor: colors.surfaceContainerLow }]}>
          <MaterialIcons name="verified-user" size={18} color={colors.secondary} />
          <Text style={[styles.securityText, { color: colors.onSurfaceVariant }]}>
            Secure AES-256 encrypted verification
          </Text>
        </View>

        <TouchableOpacity style={styles.emailLink}>
          <MaterialIcons name="mail" size={20} color={colors.primary} />
          <Text style={[styles.emailLinkText, { color: colors.primary }]}>Login with email instead</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.emailLink, { marginTop: 16 }]} 
          onPress={() => navigation.navigate('Signup')}
        >
          <MaterialIcons name="person-add" size={20} color={colors.secondary} />
          <Text style={[styles.emailLinkText, { color: colors.secondary }]}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subheading: { fontSize: 16, marginBottom: 32 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 56, borderWidth: 1, borderRadius: 16, marginBottom: 24 },
  countryCode: { paddingHorizontal: 16, height: '100%', justifyContent: 'center', borderRightWidth: 1 },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 18, fontWeight: '600' },
  sendButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  sendButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 12, marginTop: 24 },
  securityText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  emailLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 },
  emailLinkText: { fontSize: 16, fontWeight: '700' },
  roleContainer: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleButton: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
