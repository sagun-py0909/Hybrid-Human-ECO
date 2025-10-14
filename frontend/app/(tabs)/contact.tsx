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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';
// Force bundle update

type ContactType = 'program' | 'machine' | null;

interface Device {
  _id: string;
  productId: string;
  productName: string;
  model?: string;
  serialNumber?: string;
}

export default function ContactScreen() {
  const { token } = useAuth();
  const [selectedType, setSelectedType] = useState<ContactType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [userDevices, setUserDevices] = useState<Device[]>([]);

  // Program-related (schedule call) state
  const [callData, setCallData] = useState({
    preferredDate: '',
    preferredTime: '',
    notes: '',
  });

  // Machine-related (ticket) state
  const [ticketData, setTicketData] = useState({
    subject: '',
    description: '',
    productId: '',
  });

  useEffect(() => {
    if (selectedType === 'machine') {
      loadUserDevices();
    }
  }, [selectedType]);

  const loadUserDevices = async () => {
    setLoadingDevices(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/user/devices`, { headers });
      setUserDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load your devices');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSubmitCall = async () => {
    if (!callData.preferredDate || !callData.preferredTime) {
      Alert.alert('Error', 'Please fill in date and time');
      return;
    }

    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/call-requests`,
        {
          requestType: 'program',
          preferredDate: callData.preferredDate,
          preferredTime: callData.preferredTime,
          notes: callData.notes,
        },
        { headers }
      );
      Alert.alert(
        'Success',
        'Your call request has been submitted. Our team will contact you soon.'
      );
      setCallData({ preferredDate: '', preferredTime: '', notes: '' });
      setSelectedType(null);
    } catch (error) {
      console.error('Error submitting call request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketData.subject || !ticketData.description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!ticketData.productId) {
      Alert.alert('Error', 'Please select a device');
      return;
    }

    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/tickets`,
        {
          type: 'machine',
          subject: ticketData.subject,
          description: ticketData.description,
          productId: ticketData.productId,
        },
        { headers }
      );
      Alert.alert(
        'Success',
        'Your ticket has been submitted. Our support team will respond shortly.'
      );
      setTicketData({ subject: '', description: '', productId: '' });
      setSelectedType(null);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedType === null) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.optionsContainer}>
          <Text style={styles.headerTitle}>How can we help you?</Text>
          <Text style={styles.headerSubtitle}>
            Choose the type of support you need
          </Text>

          {/* Program Related */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setSelectedType('program')}
          >
            <LinearGradient
              colors={['#1A1A1A', '#2A2A2A']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="calendar" size={32} color="#8FBC8F" />
              </View>
              <Text style={styles.optionTitle}>Program Related</Text>
              <Text style={styles.optionDescription}>
                Schedule a call with our wellness executive to discuss your program,
                progress, or adjustments
              </Text>
              <View style={styles.optionAction}>
                <Text style={styles.optionActionText}>Schedule Call</Text>
                <Ionicons name="arrow-forward" size={20} color="#8FBC8F" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Machine Related */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setSelectedType('machine')}
          >
            <LinearGradient
              colors={['#1A1A1A', '#2A2A2A']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="hardware-chip" size={32} color="#8FBC8F" />
              </View>
              <Text style={styles.optionTitle}>Machine Related</Text>
              <Text style={styles.optionDescription}>
                Report an issue, request maintenance, or get technical support for your
                devices
              </Text>
              <View style={styles.optionAction}>
                <Text style={styles.optionActionText}>Raise Ticket</Text>
                <Ionicons name="arrow-forward" size={20} color="#8FBC8F" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Emergency Contact */}
          <View style={styles.emergencyCard}>
            <Ionicons name="call" size={24} color="#FF6B35" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Emergency Support</Text>
              <Text style={styles.emergencyText}>+1 (800) HYBRID-H</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (selectedType === 'program') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedType(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>Schedule a Call</Text>
          <Text style={styles.formSubtitle}>
            Request a consultation with our wellness executive
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Date *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#8FBC8F" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                value={callData.preferredDate}
                onChangeText={(text) => setCallData({ ...callData, preferredDate: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Time *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="time-outline" size={20} color="#8FBC8F" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 10:00 AM - 12:00 PM"
                placeholderTextColor="#666"
                value={callData.preferredTime}
                onChangeText={(text) => setCallData({ ...callData, preferredTime: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us what you'd like to discuss..."
                placeholderTextColor="#666"
                value={callData.notes}
                onChangeText={(text) => setCallData({ ...callData, notes: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitCall}
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
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Machine-related form
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedType(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>Raise a Ticket</Text>
        <Text style={styles.formSubtitle}>
          Report device issues or request technical support
        </Text>

        {/* Device Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Device *</Text>
          {loadingDevices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#8FBC8F" />
              <Text style={styles.loadingText}>Loading your devices...</Text>
            </View>
          ) : userDevices.length === 0 ? (
            <View style={styles.noDevicesContainer}>
              <Ionicons name="alert-circle-outline" size={24} color="#FF6B35" />
              <Text style={styles.noDevicesText}>
                No devices found. Please contact support to assign devices to your account.
              </Text>
            </View>
          ) : (
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={ticketData.productId}
                onValueChange={(value) =>
                  setTicketData({ ...ticketData, productId: value })
                }
                style={styles.picker}
                dropdownIconColor="#8FBC8F"
              >
                <Picker.Item label="-- Select a device --" value="" />
                {userDevices.map((device) => (
                  <Picker.Item
                    key={device._id}
                    label={`${device.productName}${device.serialNumber ? ` (${device.serialNumber})` : ''}`}
                    value={device.productId}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="document-text-outline" size={20} color="#8FBC8F" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Brief description of the issue"
              placeholderTextColor="#666"
              value={ticketData.subject}
              onChangeText={(text) => setTicketData({ ...ticketData, subject: text })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please provide details about the issue, including device type, error messages, and when it started..."
              placeholderTextColor="#666"
              value={ticketData.description}
              onChangeText={(text) => setTicketData({ ...ticketData, description: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitTicket}
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
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0DC',
  },
  optionsContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 32,
  },
  optionCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0D5C0',
  },
  optionGradient: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0E6D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
    marginBottom: 16,
  },
  optionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#556B2F',
    marginRight: 8,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  emergencyContent: {
    marginLeft: 16,
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
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
    height: 120,
    paddingTop: 16,
    paddingBottom: 16,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  pickerWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  picker: {
    color: '#E8E8E8',
    height: 52,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  loadingText: {
    fontSize: 14,
    color: '#8FBC8F',
    marginLeft: 12,
  },
  noDevicesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  noDevicesText: {
    fontSize: 14,
    color: '#E8E8E8',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
