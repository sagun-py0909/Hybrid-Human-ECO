import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function DNACollectionScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [formData, setFormData] = useState({
    address: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
  });

  useEffect(() => {
    loadExistingRequest();
  }, []);

  const loadExistingRequest = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/dna-collection-request/my`, { headers });
      if (response.data && response.data._id) {
        setExistingRequest(response.data);
      }
    } catch (error) {
      console.error('Error loading existing request:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.address || !formData.preferredDate || !formData.preferredTime) {
      Alert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams({
        address: formData.address,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
      });
      if (formData.notes) {
        params.append('notes', formData.notes);
      }

      await axios.post(`${API_URL}/dna-collection-request?${params.toString()}`, {}, { headers });

      Alert.alert(
        'Request Submitted!',
        'Your DNA collection request has been submitted. Our team will contact you shortly to confirm the appointment.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (existingRequest) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'DNA Collection',
            headerStyle: { backgroundColor: '#FAF0DC' },
            headerTintColor: '#1A1A1A',
          }}
        />
        
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
          <View style={styles.statusCard}>
            <View style={styles.statusIconContainer}>
              <Ionicons 
                name={existingRequest.status === 'completed' ? 'checkmark-circle' : 'time'} 
                size={64} 
                color={existingRequest.status === 'completed' ? '#8FBC8F' : '#556B2F'} 
              />
            </View>
            
            <Text style={styles.statusTitle}>Request {existingRequest.status}</Text>
            
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color="#556B2F" />
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{existingRequest.address}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={20} color="#556B2F" />
                <Text style={styles.detailLabel}>Preferred Date:</Text>
                <Text style={styles.detailValue}>{existingRequest.preferredDate}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color="#556B2F" />
                <Text style={styles.detailLabel}>Preferred Time:</Text>
                <Text style={styles.detailValue}>{existingRequest.preferredTime}</Text>
              </View>

              {existingRequest.scheduledDate && (
                <View style={styles.scheduledInfo}>
                  <Text style={styles.scheduledTitle}>✅ Scheduled Appointment</Text>
                  <Text style={styles.scheduledText}>
                    Date: {existingRequest.scheduledDate} at {existingRequest.scheduledTime}
                  </Text>
                </View>
              )}

              {existingRequest.adminNotes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Admin Notes:</Text>
                  <Text style={styles.notesText}>{existingRequest.adminNotes}</Text>
                </View>
              )}
            </View>

            <Text style={styles.infoText}>
              {existingRequest.status === 'pending' && 'Our team will contact you soon to confirm your appointment.'}
              {existingRequest.status === 'scheduled' && 'Your appointment has been scheduled! Our team will visit you at the confirmed time.'}
              {existingRequest.status === 'completed' && 'DNA sample collection is complete. Results will be available soon.'}
              {existingRequest.status === 'cancelled' && 'This request has been cancelled. Please contact support if you need assistance.'}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Request DNA Collection',
          headerStyle: { backgroundColor: '#FAF0DC' },
          headerTintColor: '#1A1A1A',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Ionicons name="flask" size={48} color="#556B2F" />
          <Text style={styles.headerTitle}>Schedule DNA Collection</Text>
          <Text style={styles.headerSubtitle}>
            Our certified team will visit your location to collect DNA samples safely and professionally.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your full address..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Date *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar" size={20} color="#556B2F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2025-06-20)"
              placeholderTextColor="#555"
              value={formData.preferredDate}
              onChangeText={(text) => setFormData({ ...formData, preferredDate: text })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Time *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="time" size={20} color="#556B2F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="HH:MM (e.g., 14:00)"
              placeholderTextColor="#555"
              value={formData.preferredTime}
              onChangeText={(text) => setFormData({ ...formData, preferredTime: text })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Notes (Optional)</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any special instructions or preferences..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#556B2F" />
          <Text style={styles.infoCardText}>
            Our team will contact you within 24 hours to confirm the appointment and provide additional instructions.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#556B2F', '#8FBC8F']}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0DC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D0C5B0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0C5B0',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5E6',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FAF0DC',
    borderTopWidth: 1,
    borderTopColor: '#E0D5C0',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0C5B0',
    alignItems: 'center',
  },
  statusIconContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 24,
    textTransform: 'capitalize',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#F0E6D0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detailValue: {
    fontSize: 14,
    color: '#4A4A4A',
    flex: 1,
  },
  scheduledInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  scheduledTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  scheduledText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 20,
  },
});
