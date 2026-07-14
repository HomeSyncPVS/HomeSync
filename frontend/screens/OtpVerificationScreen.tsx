import React, { useState, useEffect, useRef } from 'react';
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

interface OtpVerificationScreenProps {
  target: string; // The email/phone number destination
  purpose?: 'register' | 'reset';
  onVerificationSuccess: (token?: string, access_token?: string, refresh_token?: string, role?: string) => void;
  onNavigateBack: () => void;
  apiBaseUrl?: string;
}

export default function OtpVerificationScreen({
  target,
  purpose = 'register',
  onVerificationSuccess,
  onNavigateBack,
  apiBaseUrl = 'http://10.0.2.2:8000/api/v1',
}: OtpVerificationScreenProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  // Refs for each digit TextInput box to support autofocusing next/previous box
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Send initial OTP on load
  useEffect(() => {
    if (purpose !== 'register') {
      sendOtp();
    }
  }, []);

  // Cooldown countdown timer logic
  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async (isResend = false) => {
    if (isResend) {
      setResending(true);
      setErrorMessage(null);
      setSuccessMessage(null);
    }

    try {
      const endpoint = isResend ? 'resend-otp' : 'send-otp';
      const response = await fetch(`${apiBaseUrl}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: target,
          purpose: purpose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send OTP code.');
      }

      if (isResend) {
        setSuccessMessage('A fresh OTP code has been sent!');
        setCooldown(60); // Reset timer
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while sending OTP.');
    } finally {
      if (isResend) setResending(false);
    }
  };

  const handleInputChange = (text: string, index: number) => {
    // Only accept numeric entries
    const sanitized = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = sanitized;
    setCode(newCode);

    if (errorMessage) setErrorMessage(null);

    // Auto-focus next box if digit is entered
    if (sanitized !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace when input box is empty to focus previous input box
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: target,
          code: fullCode,
          purpose: purpose,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Verification failed. Try again.');
      }

      setSuccessMessage(purpose === 'reset' ? 'OTP verified successfully!' : 'Account verified successfully!');
      // Let app navigate or switch state
      setTimeout(() => {
        onVerificationSuccess(data.token, data.access_token, data.refresh_token, data.user?.role?.name);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect OTP code or expired.');
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
          <TouchableOpacity style={styles.backButton} onPress={onNavigateBack} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.titleText}>
              {purpose === 'reset' ? 'Reset Password' : 'Verify Account'}
            </Text>
            <Text style={styles.subtitleText}>
              We sent a 6-digit verification code to your registered destination:
            </Text>
            <Text style={styles.targetText}>{target}</Text>
          </View>

          {/* Verification Card */}
          <View style={styles.card}>
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* OTP Input Grid */}
            <View style={styles.otpGrid}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  style={styles.otpBox}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleInputChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            {/* Resend Logic */}
            <View style={styles.resendContainer}>
              {cooldown > 0 ? (
                <Text style={styles.cooldownText}>Resend code in {cooldown}s</Text>
              ) : (
                <TouchableOpacity
                  onPress={() => sendOtp(true)}
                  disabled={resending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
    marginBottom: 6,
  },
  targetText: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    color: '#1E232C',
    textAlign: 'center',
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
  successBanner: {
    backgroundColor: '#E6F7F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A3E3C9',
  },
  successText: {
    fontFamily: 'System',
    color: '#34B37A',
    fontSize: 14,
    fontWeight: '500',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 44,
    height: 52,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#1E232C',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  cooldownText: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#9EA6B5',
  },
  resendText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#2F6FED',
  },
});
