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
import { saveTokens, saveUserRole } from '../utils/storage';

interface LoginScreenProps {
  onLoginSuccess: (role: string) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onLoginWithOtp: (target: string) => void;
  apiBaseUrl?: string;
}

export default function LoginScreen({
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onLoginWithOtp,
  apiBaseUrl = 'http://172.171.15.222:8000/api/v1'
}: LoginScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secureText, setSecureText] = useState(true);

  // Field validation
  const validateForm = () => {
    if (!identifier.trim()) {
      setErrorMessage('Please enter email or phone number');
      return false;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate with /auth/login
      const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: identifier.trim(),
          password: password,
          device_type: Platform.OS,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.detail || 'Invalid credentials or login failed');
      }

      const { access_token, refresh_token } = loginData;

      // Save tokens securely
      await saveTokens(access_token, refresh_token);

      // 2. Fetch authenticated user details with /auth/me
      const meResponse = await fetch(`${apiBaseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      const meData = await meResponse.json();

      if (!meResponse.ok) {
        throw new Error('Failed to retrieve user details');
      }

      // Extract role
      const userRole = meData.role?.name || 'Resident';

      // Save role info
      await saveUserRole(userRole);

      // Notify App layout to switch stack router
      onLoginSuccess(userRole);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLoginOtp = async () => {
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email address to receive OTP');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: identifier.trim(),
          purpose: 'LOGIN',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send OTP.');
      }
      onLoginWithOtp(identifier.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Area */}
          <View style={styles.headerContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>HS</Text>
            </View>
            <Text style={styles.titleText}>Welcome back</Text>
            <Text style={styles.subtitleText}>Sign in to access your HomeSync dashboard</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Input Email/Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email or Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter email or phone"
                placeholderTextColor="#9EA6B5"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Input Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={onNavigateToForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9EA6B5"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={secureText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setSecureText(!secureText)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeButtonText}>{secureText ? 'Show' : 'Hide'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Login with OTP Button */}
            <TouchableOpacity
              style={[styles.otpButton, loading && styles.buttonDisabled]}
              onPress={handleRequestLoginOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.otpButtonText}>Sign In with Email OTP 📩</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom helper info */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
              <Text style={styles.registerText}> Register Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA', // Design Background
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#2F6FED', // Primary
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2F6FED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoBadgeText: {
    fontFamily: 'System', // Will map to headings font Manrope in styling rules
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  titleText: {
    fontFamily: 'System', // Heading Font: Manrope
    fontSize: 28,
    fontWeight: '700',
    color: '#1E232C',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontFamily: 'System', // Body Font: Inter
    fontSize: 15,
    color: '#687588',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // Border radius 16px
    padding: 24,
    shadowColor: '#1E232C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, // Soft shadows, no harsh borders
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 0,
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
    color: '#E5484D', // Design Error
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#384252',
    marginBottom: 8,
  },
  forgotText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#2F6FED', // Design Primary
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
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  eyeButtonText: {
    color: '#687588',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2F6FED', // Primary
    borderRadius: 16, // Border radius 16px
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  otpButton: {
    backgroundColor: '#F0F5FF',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D0E1FD',
  },
  otpButtonText: {
    color: '#2F6FED',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#687588',
  },
  registerText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6FED', // Primary
  },
});
