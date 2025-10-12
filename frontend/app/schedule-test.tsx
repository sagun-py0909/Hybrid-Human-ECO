import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function ScheduleTestScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    preferredDate: '',
    preferredTime: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.preferredDate || !formData.preferredTime) {
      Alert.alert('Error', 'Please fill in date and time');
      return;
    }

    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/call-requests`,
        {
          requestType: 'test',
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
          notes: formData.notes,
        },
        { headers }
      );
      Alert.alert(
        'Success',
        'Your test has been scheduled. Our team will contact you to confirm the appointment.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error scheduling test:', error);
      Alert.alert('Error', 'Failed to schedule test. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Schedule a Test',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#E8E8E8',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="flask" size={48} color="#8FBC8F" />
            <Text style={styles.infoTitle}>Health Assessment</Text>
            <Text style={styles.infoText}>
              Schedule a comprehensive health test and assessment. Our team will reach
              out to confirm your appointment and provide preparation instructions.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Date *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#8FBC8F"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  value={formData.preferredDate}
                  onChangeText={(text) => setFormData({ ...formData, preferredDate: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Time *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#8FBC8F"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10:00 AM - 12:00 PM"
                  placeholderTextColor="#666"
                  value={formData.preferredTime}
                  onChangeText={(text) => setFormData({ ...formData, preferredTime: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any specific health concerns or questions?"
                  placeholderTextColor="#666"
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

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
                  <Text style={styles.submitButtonText}>Schedule Test</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8E8E8',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#E8E8E8',
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
});
