import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { useTheme } from '../../theme/ThemeContext';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

type Role = 'Resident' | 'Secretary' | 'Chairman';

export function SignupScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  
  // Step: 1 = Personal info, 2 = Society info, 3 = Flat info (only for Resident)
  const [step, setStep] = useState(1);
  
  // Step 1: Personal Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Resident');

  // Step 2: Society Info
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');
  const [societyRegion, setSocietyRegion] = useState('');
  const [societyCity, setSocietyCity] = useState('');
  const [societyState, setSocietyState] = useState('');
  const [societyPincode, setSocietyPincode] = useState('');
  const [societyPhone, setSocietyPhone] = useState('');
  const [societyEmail, setSocietyEmail] = useState('');

  // Step 3: Flat Info (Resident Only)
  const [flatNumber, setFlatNumber] = useState('');
  const [wingName, setWingName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [flatType, setFlatType] = useState('2BHK'); // Default value
  const [flatSize, setFlatSize] = useState('');

  const isStep1Valid = fullName.length >= 2 && email.includes('@') && phone.length === 10 && password.length >= 8;
  const isStep2Valid = societyName.length >= 3 && societyAddress.length >= 5 && societyRegion.length >= 3 && societyCity.length >= 2 && societyState.length >= 2 && societyPincode.length === 6;
  const isStep3Valid = flatNumber.length > 0 && wingName.length > 0 && floorNumber.length > 0 && flatSize.length > 0;

  function handleNext() {
    if (step === 1 && isStep1Valid) {
      setStep(2);
    } else if (step === 2 && isStep2Valid) {
      if (role === 'Resident') {
        setStep(3);
      } else {
        handleSignup();
      }
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  }

  async function handleSignup() {
    // Collect and construct the registration payload
    const payload = {
      email,
      phone,
      password,
      fullName,
      role,
      societyDetails: {
        name: societyName,
        address: societyAddress,
        region: societyRegion,
        city: societyCity,
        state: societyState,
        pincode: societyPincode,
        phone: societyPhone || undefined,
        email: societyEmail || undefined,
      },
      ...(role === 'Resident' && {
        flatDetails: {
          flatNumber,
          wingName,
          floorNumber: parseInt(floorNumber, 10),
          flatType,
          flatSize: parseFloat(flatSize),
        }
      })
    };

    // Simulate API registration call or redirect
    Alert.alert(
      'Registration Success',
      `Welcome to HomeSync as a ${role}!`,
      [
        {
          text: 'Proceed',
          onPress: () => {
            if (role === 'Resident') {
              navigation.reset({ index: 0, routes: [{ name: 'ResidentTabs' }] });
            } else {
              navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
            }
          }
        }
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Create Account" onBack={handleBack} />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 40 }}>
        
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={[styles.stepText, { color: colors.primary }]}>
            Step {step} of {role === 'Resident' ? 3 : 2}
          </Text>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: colors.primary, 
                  width: `${(step / (role === 'Resident' ? 3 : 2)) * 100}%` 
                }
              ]} 
            />
          </View>
        </View>

        {step === 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>Personal Details</Text>
            
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="Aman Gupta"
              placeholderTextColor={colors.outline}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="aman@example.com"
              placeholderTextColor={colors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="9876543210"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Password (min 8 characters)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="••••••••"
              placeholderTextColor={colors.outline}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Register As</Text>
            <View style={styles.roleContainer}>
              {(['Resident', 'Secretary', 'Chairman'] as Role[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleButton,
                    {
                      borderColor: role === r ? colors.primary : colors.outlineVariant,
                      backgroundColor: role === r ? colors.surfaceContainer : colors.surface,
                    }
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text style={{ color: role === r ? colors.primaryContainer : colors.onSurface, fontWeight: '700' }}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>Society Details</Text>
            
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Society Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="SocietyHub Heights"
              placeholderTextColor={colors.outline}
              value={societyName}
              onChangeText={setSocietyName}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Address</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="Plot 45, Sector 15"
              placeholderTextColor={colors.outline}
              value={societyAddress}
              onChangeText={setSocietyAddress}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Region / Locality</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="Kharghar"
              placeholderTextColor={colors.outline}
              value={societyRegion}
              onChangeText={setSocietyRegion}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>City</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="Navi Mumbai"
              placeholderTextColor={colors.outline}
              value={societyCity}
              onChangeText={setSocietyCity}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>State</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="Maharashtra"
              placeholderTextColor={colors.outline}
              value={societyState}
              onChangeText={setSocietyState}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Pincode</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="410210"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              maxLength={6}
              value={societyPincode}
              onChangeText={setSocietyPincode}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Society Phone (Optional)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="022-27749876"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              value={societyPhone}
              onChangeText={setSocietyPhone}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Society Email (Optional)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="office@societyhub.com"
              placeholderTextColor={colors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              value={societyEmail}
              onChangeText={setSocietyEmail}
            />
          </View>
        )}

        {step === 3 && role === 'Resident' && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>Flat Details</Text>
            
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Flat / Unit Number</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="B-402"
              placeholderTextColor={colors.outline}
              value={flatNumber}
              onChangeText={setFlatNumber}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Wing Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="B Wing"
              placeholderTextColor={colors.outline}
              value={wingName}
              onChangeText={setWingName}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Floor Number</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="4"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              value={floorNumber}
              onChangeText={setFloorNumber}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Flat Size (sq. ft.)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surface }]}
              placeholder="1050"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              value={flatSize}
              onChangeText={setFlatSize}
            />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Flat Type</Text>
            <View style={styles.roleContainer}>
              {['1BHK', '2BHK', '3BHK', '4BHK'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.roleButton,
                    {
                      borderColor: flatType === t ? colors.primary : colors.outlineVariant,
                      backgroundColor: flatType === t ? colors.surfaceContainer : colors.surface,
                    }
                  ]}
                  onPress={() => setFlatType(t)}
                >
                  <Text style={{ color: flatType === t ? colors.primaryContainer : colors.onSurface, fontWeight: '700' }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity 
              style={[styles.buttonBack, { borderColor: colors.outline }]}
              onPress={handleBack}
            >
              <Text style={{ color: colors.onSurface, fontWeight: '700' }}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.buttonNext, 
              { 
                backgroundColor: 
                  (step === 1 && isStep1Valid) || 
                  (step === 2 && isStep2Valid) || 
                  (step === 3 && isStep3Valid)
                    ? colors.primary 
                    : colors.outlineVariant 
              }
            ]}
            disabled={
              (step === 1 && !isStep1Valid) || 
              (step === 2 && !isStep2Valid) || 
              (step === 3 && !isStep3Valid)
            }
            onPress={
              (step === 2 && role !== 'Resident') || (step === 3)
                ? handleSignup
                : handleNext
            }
          >
            <Text style={styles.buttonText}>
              {((step === 2 && role !== 'Resident') || step === 3) ? 'Register & Finish' : 'Next'}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: { marginBottom: 24 },
  stepText: { fontSize: 13, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  progressBarBg: { height: 6, backgroundColor: '#E5EEFF', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  section: { gap: 4 },
  sectionHeading: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', marginTop: 12 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontWeight: '600' },
  roleContainer: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleButton: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  buttonBack: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonNext: { flex: 2, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
