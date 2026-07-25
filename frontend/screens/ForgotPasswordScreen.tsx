import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar } from 'react-native';

import { API_BASE_URL } from '../utils/api';

interface ForgotPasswordScreenProps {
  onSuccess: (email: string) => void;
  onNavigateToLogin: () => void;
  apiBaseUrl?: string;
}

export default function ForgotPasswordScreen({
  onSuccess,
  onNavigateToLogin,
  apiBaseUrl = API_BASE_URL,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send recovery instructions.');
      }

      onSuccess(email.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Header Nav */}
          <TouchableOpacity style={styles.backButton} onPress={onNavigateToLogin} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.titleText}>Forgot Password</Text>
            <Text style={styles.subtitleText}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {success ? (
              <View style={styles.successState}>
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>✓</Text>
                </View>
                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successSubtitle}>
                  We've sent password reset instructions to:
                </Text>
                <Text style={styles.successEmail}>{email.trim()}</Text>

                <TouchableOpacity
                  style={styles.button}
                  onPress={() => onSuccess(email.trim())}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Enter Token Manually</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="john@example.com"
                    placeholderTextColor="#9EA6B5"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleResetRequest}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    color: '#2F6FED',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleText: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    color: '#1E232C',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontFamily: 'System',
    fontSize: 15,
    color: '#687588',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  errorBanner: {
    backgroundColor: '#FEECEC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDB8B9',
  },
  errorText: {
    fontFamily: 'System',
    color: '#E5484D',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#384252',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E232C',
    fontFamily: 'System',
  },
  button: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6FED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F7F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successBadgeText: {
    fontSize: 24,
    color: '#34B37A',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E232C',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#687588',
    textAlign: 'center',
    marginBottom: 4,
  },
  successEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E232C',
    marginBottom: 28,
    textAlign: 'center',
  },
});
