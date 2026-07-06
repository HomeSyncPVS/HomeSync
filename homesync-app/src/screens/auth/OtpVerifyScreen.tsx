import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OtpVerify'>;
type Rt = RouteProp<RootStackParamList, 'OtpVerify'>;

const OTP_LENGTH = 6;

export function OtpVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { colors, spacing } = useTheme();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(45);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  function handleChange(text: string, index: number) {
    const clean = text.replace(/\D/g, '');
    const next = [...digits];
    next[index] = clean.slice(-1);
    setDigits(next);
    if (clean && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;
  const timerLabel = `00:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  function handleVerify() {
    if (!isComplete) return;
    // TODO: wire to POST /auth/verify-otp once backend is live
    if (route.params.role === 'Admin') {
      navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'ResidentTabs' }] });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Verify Phone" />
      <View style={{ padding: spacing.containerMargin, flex: 1 }}>
        <View style={styles.heading}>
          <Text style={[styles.headingTitle, { color: colors.onSurface }]}>Verify Phone</Text>
          <Text style={[styles.headingSub, { color: colors.onSurfaceVariant }]}>
            Sent to <Text style={{ fontWeight: '700', color: colors.onSurface }}>+91 {route.params.phone}</Text>
          </Text>
        </View>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputs.current[i] = ref; }}
              style={[
                styles.otpBox,
                { borderColor: colors.outlineVariant, backgroundColor: colors.surface, color: colors.onSurface },
              ]}
              maxLength={1}
              keyboardType="number-pad"
              value={d}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
            />
          ))}
        </View>

        <View style={styles.timerRow}>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
            Resend OTP in <Text style={{ color: colors.primary, fontWeight: '700' }}>{timerLabel}</Text>
          </Text>
          <TouchableOpacity disabled={secondsLeft > 0} onPress={() => setSecondsLeft(45)}>
            <Text style={{ color: secondsLeft > 0 ? colors.outline : colors.primary, fontSize: 14, marginTop: 8 }}>
              I didn't receive a code
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.verifyButton, { backgroundColor: isComplete ? colors.primary : colors.outlineVariant }]}
          onPress={handleVerify}
          disabled={!isComplete}
        >
          <Text style={styles.verifyButtonText}>Verify</Text>
          <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.terms, { color: colors.onSurfaceVariant }]}>
          By verifying, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { alignItems: 'center', marginBottom: 32 },
  headingTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  headingSub: { fontSize: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 24 },
  otpBox: { flex: 1, height: 56, textAlign: 'center', fontSize: 24, fontWeight: '700', borderWidth: 1, borderRadius: 12 },
  timerRow: { alignItems: 'center' },
  verifyButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  verifyButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  terms: { fontSize: 11, textAlign: 'center', marginTop: 16, paddingHorizontal: 24 },
});
