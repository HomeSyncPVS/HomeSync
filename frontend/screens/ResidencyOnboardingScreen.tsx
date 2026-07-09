import React, { useState } from 'react';
import { StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../utils/api';

interface ResidencyOnboardingScreenProps {
  onLogout: () => void;
  onRefreshProfile: () => void;
}

interface SocietyDetails {
  id: string;
  name: string;
  address?: string;
  region: string;
  city: string;
  state: string;
  wings: Array<{
    id: string;
    name: string;
    floors: Array<{
      id: string;
      floor_number: number;
      flats: Array<{
        id: string;
        flat_number: string;
        flat_type: string;
      }>;
    }>;
  }>;
}

export default function ResidencyOnboardingScreen({
  onLogout,
  onRefreshProfile,
}: ResidencyOnboardingScreenProps) {
  const [mode, setMode] = useState<'landing' | 'create' | 'join'>('landing');
  const [loading, setLoading] = useState(false);

  // Create residency state
  const [societyName, setSocietyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [numWings, setNumWings] = useState('1');
  const [wingNames, setWingNames] = useState('');
  const [floorsPerWing, setFloorsPerWing] = useState('1');
  const [flatsPerFloor, setFlatsPerFloor] = useState('4');

  // Join residency state
  const [joinCode, setJoinCode] = useState('');
  const [verifiedSociety, setVerifiedSociety] = useState<SocietyDetails | null>(null);
  
  // Dropdown/picker selections for join flow
  const [selectedWingId, setSelectedWingId] = useState<string>('');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedFlatId, setSelectedFlatId] = useState<string>('');

  const handleVerifyJoinCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Required', 'Please enter a join code.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/societies/join/verify?code=${joinCode.trim()}`);
      setVerifiedSociety(res.data);
      // Reset dropdowns
      setSelectedWingId('');
      setSelectedFloorId('');
      setSelectedFlatId('');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.detail || 'Invalid or expired residency join code.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSociety = async () => {
    if (!selectedFlatId) {
      Alert.alert('Selection Required', 'Please select a flat to request join.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/societies/join', {
        join_code: joinCode.trim(),
        flat_id: selectedFlatId,
      });
      Alert.alert('Request Sent', 'Your join request has been submitted. All features will unlock once approved by the Residency Owner.', [
        { text: 'OK', onPress: onRefreshProfile }
      ]);
    } catch (err: any) {
      Alert.alert('Request Failed', err.response?.data?.detail || 'Failed to submit join request.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSociety = async () => {
    if (!societyName.trim() || !region.trim() || !city.trim() || !stateName.trim() || !pincode.trim() || !phone.trim() || !email.trim()) {
      Alert.alert('Missing Info', 'Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      const parsedWings = parseInt(numWings) || 1;
      const customWings = wingNames.split(',').map(s => s.trim()).filter(s => s !== '');

      const payload = {
        name: societyName.trim(),
        address: address.trim() || undefined,
        region: region.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        structure: {
          num_wings: parsedWings,
          wing_names: customWings.length > 0 ? customWings : undefined,
          floors_per_wing: parseInt(floorsPerWing) || 1,
          flats_per_floor: parseInt(flatsPerFloor) || 1,
          flat_type: '2BHK',
          flat_size: 1000.0,
        },
      };

      const res = await apiClient.post('/societies', payload);
      Alert.alert('Residency Created', `Society created successfully! Your Unique Join Code is: ${res.data.join_code}. Copy this to invite other residents.`, [
        { text: 'Let\'s Go', onPress: onRefreshProfile }
      ]);
    } catch (err: any) {
      Alert.alert('Creation Failed', err.response?.data?.detail || 'An error occurred during residency setup.');
    } finally {
      setLoading(false);
    }
  };

  const renderLanding = () => (
    <View style={styles.contentContainer}>
      <View style={styles.card}>
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔐</Text>
        </View>
        <Text style={styles.cardTitle}>Application Locked</Text>
        <Text style={styles.cardSubtitle}>
          All application features remain locked until you are associated with an approved residency.
        </Text>
        <Text style={styles.cardTip}>
          Get started by setting up a new residency for your society or joining an existing one.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { marginTop: 24 }]}
        onPress={() => setMode('create')}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>🏢 Create Residency</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setMode('join')}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonText}>🔑 Join Residency</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreate = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backLink} onPress={() => setMode('landing')}>
        <Text style={styles.backLinkText}>← Go Back</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Setup Your Residency</Text>
      <Text style={styles.screenSubtitle}>Initialize your society profile and generate its flat layout automatically.</Text>

      <View style={styles.formCard}>
        <Text style={styles.sectionHeader}>Residency Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Society Name *</Text>
          <TextInput style={styles.input} placeholder="Greenwood Heights" value={societyName} onChangeText={setSocietyName} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} placeholder="Sector 45, Near City Park" value={address} onChangeText={setAddress} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Locality / Region *</Text>
            <TextInput style={styles.input} placeholder="Sector 45" value={region} onChangeText={setRegion} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>City *</Text>
            <TextInput style={styles.input} placeholder="Gurugram" value={city} onChangeText={setCity} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>State *</Text>
            <TextInput style={styles.input} placeholder="Haryana" value={stateName} onChangeText={setStateName} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>PIN Code *</Text>
            <TextInput style={styles.input} keyboardType="number-pad" maxLength={6} placeholder="122003" value={pincode} onChangeText={setPincode} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" placeholder="9876543210" value={phone} onChangeText={setPhone} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" placeholder="info@society.com" value={email} onChangeText={setEmail} />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Society Structure Config</Text>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Number of Wings *</Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={numWings} onChangeText={setNumWings} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Floors per Wing *</Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={floorsPerWing} onChangeText={setFloorsPerWing} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Flats per Floor *</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={flatsPerFloor} onChangeText={setFlatsPerFloor} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Wing Names (Optional, comma separated)</Text>
          <TextInput style={styles.input} placeholder="A, B, C" value={wingNames} onChangeText={setWingNames} />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled, { marginTop: 16 }]}
          disabled={loading}
          onPress={handleCreateSociety}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Generate & Create Society</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderJoin = () => {
    // Determine dynamic options for floor dropdown based on selected wing
    const wing = verifiedSociety?.wings.find(w => w.id === selectedWingId);
    const floors = wing ? wing.floors : [];
    // Determine dynamic options for flats based on selected floor
    const floor = floors.find(f => f.id === selectedFloorId);
    const flats = floor ? floor.flats : [];

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backLink} onPress={() => { setMode('landing'); setVerifiedSociety(null); }}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Join a Residency</Text>
        <Text style={styles.screenSubtitle}>Enter your society join code to find your building and request flat association.</Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Residency Join Code</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Enter 8-digit Code"
                value={joinCode}
                onChangeText={(text) => {
                  setJoinCode(text);
                  setVerifiedSociety(null);
                }}
                autoCapitalize="characters"
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.verifyButton, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={handleVerifyJoinCode}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {verifiedSociety && (
            <View style={styles.verificationResult}>
              <View style={styles.successMarker}>
                <Text style={styles.successMarkerText}>✓ Society Found</Text>
              </View>
              <Text style={styles.societyNameText}>{verifiedSociety.name}</Text>
              <Text style={styles.societyAddressText}>
                📍 {verifiedSociety.address || ''}, {verifiedSociety.region}, {verifiedSociety.city}, {verifiedSociety.state}
              </Text>

              <Text style={styles.selectionTitle}>Select Your Residence Details</Text>

              {/* Wing Selection */}
              <Text style={styles.dropdownLabel}>Wing</Text>
              <View style={styles.dropdownGrid}>
                {verifiedSociety.wings.map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.gridSelectOption, selectedWingId === w.id && styles.gridSelectOptionActive]}
                    onPress={() => {
                      setSelectedWingId(w.id);
                      setSelectedFloorId('');
                      setSelectedFlatId('');
                    }}
                  >
                    <Text style={[styles.gridOptionText, selectedWingId === w.id && styles.gridOptionTextActive]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Floor Selection */}
              {selectedWingId !== '' && (
                <>
                  <Text style={styles.dropdownLabel}>Floor</Text>
                  <View style={styles.dropdownGrid}>
                    {floors.map(f => (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.gridSelectOption, selectedFloorId === f.id && styles.gridSelectOptionActive]}
                        onPress={() => {
                          setSelectedFloorId(f.id);
                          setSelectedFlatId('');
                        }}
                      >
                        <Text style={[styles.gridOptionText, selectedFloorId === f.id && styles.gridOptionTextActive]}>
                          Floor {f.floor_number}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Flat Selection */}
              {selectedFloorId !== '' && (
                <>
                  <Text style={styles.dropdownLabel}>Flat Number</Text>
                  <View style={styles.dropdownGrid}>
                    {flats.map(fl => (
                      <TouchableOpacity
                        key={fl.id}
                        style={[styles.gridSelectOption, selectedFlatId === fl.id && styles.gridSelectOptionActive]}
                        onPress={() => setSelectedFlatId(fl.id)}
                      >
                        <Text style={[styles.gridOptionText, selectedFlatId === fl.id && styles.gridOptionTextActive]}>
                          {fl.flat_number}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {selectedFlatId !== '' && (
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled, { marginTop: 24 }]}
                  disabled={loading}
                  onPress={handleJoinSociety}
                  activeOpacity={0.8}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Request to Join</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {mode === 'landing' && renderLanding()}
        {mode === 'create' && renderCreate()}
        {mode === 'join' && renderJoin()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styling for premium aesthetic
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardTip: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F6FED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    alignSelf: 'center',
    marginTop: 32,
    padding: 8,
  },
  logoutButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  backLink: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2F6FED',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingBottom: 6,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verificationResult: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingTop: 16,
  },
  successMarker: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  successMarkerText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  societyNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  societyAddressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  selectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 6,
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridSelectOption: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridSelectOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2F6FED',
  },
  gridOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  gridOptionTextActive: {
    color: '#2F6FED',
    fontWeight: '600',
  },
});
