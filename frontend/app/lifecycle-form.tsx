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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from './contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Step1Data {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  email: string;
  phone: string;
}

interface Step2Data {
  sleepHours: string;
  sleepQuality: string;
  sleepIssues: string;
  stressLevel: string;
  fitnessLevel: string;
}

interface Step3Data {
  dietType: string;
  allergies: string;
  supplementUse: string;
  hydrationLevel: string;
}

interface Step4Data {
  conditions: string;
  medications: string;
  familyHistory: string;
  healthGoals: string;
}

export default function LifecycleFormScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Basic Info
  const [step1, setStep1] = useState<Step1Data>({
    name: user?.fullName || '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Step 2: Lifestyle
  const [step2, setStep2] = useState<Step2Data>({
    sleepHours: '',
    sleepQuality: '3',
    sleepIssues: '',
    stressLevel: '3',
    fitnessLevel: '',
  });

  // Step 3: Nutrition
  const [step3, setStep3] = useState<Step3Data>({
    dietType: '',
    allergies: '',
    supplementUse: '',
    hydrationLevel: '',
  });

  // Step 4: Medical
  const [step4, setStep4] = useState<Step4Data>({
    conditions: '',
    medications: '',
    familyHistory: '',
    healthGoals: '',
  });

  const validateStep1 = () => {
    if (!step1.name || !step1.age || !step1.gender || !step1.height || !step1.weight || !step1.email || !step1.phone) {
      Alert.alert('Required Fields', 'Please fill in all fields');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!step2.sleepHours || !step2.fitnessLevel) {
      Alert.alert('Required Fields', 'Please fill in all fields');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!step3.dietType || !step3.hydrationLevel) {
      Alert.alert('Required Fields', 'Please fill in all fields');
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!step4.healthGoals) {
      Alert.alert('Required Fields', 'Please describe your health goals');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    setIsLoading(true);
    try {
      const formData = {
        step1: {
          name: step1.name,
          age: parseInt(step1.age),
          gender: step1.gender,
          height: parseFloat(step1.height),
          weight: parseFloat(step1.weight),
          email: step1.email,
          phone: step1.phone,
        },
        step2: {
          sleepHours: parseFloat(step2.sleepHours),
          sleepQuality: parseInt(step2.sleepQuality),
          sleepIssues: step2.sleepIssues || null,
          stressLevel: parseInt(step2.stressLevel),
          fitnessLevel: step2.fitnessLevel,
        },
        step3: {
          dietType: step3.dietType,
          allergies: step3.allergies || null,
          supplementUse: step3.supplementUse || null,
          hydrationLevel: step3.hydrationLevel,
        },
        step4: {
          conditions: step4.conditions || null,
          medications: step4.medications || null,
          familyHistory: step4.familyHistory || null,
          healthGoals: step4.healthGoals,
        },
      };

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/lifecycle-form`, formData, { headers });

      Alert.alert(
        'Success!',
        'Your profile has been submitted. Our team will review your information and set up your personalized program.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to submit form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.progressDot,
            currentStep >= step && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Let's start with your basic details</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name *</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#555"
            value={step1.name}
            onChangeText={(text) => setStep1({ ...step1, name: text })}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Age *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={step1.age}
              onChangeText={(text) => setStep1({ ...step1, age: text })}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={step1.gender}
              onValueChange={(value) => setStep1({ ...step1, gender: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Height (cm) *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="170"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={step1.height}
              onChangeText={(text) => setStep1({ ...step1, height: text })}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Weight (kg) *</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="70"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={step1.weight}
              onChangeText={(text) => setStep1({ ...step1, weight: text })}
            />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#555"
            keyboardType="email-address"
            autoCapitalize="none"
            value={step1.email}
            onChangeText={(text) => setStep1({ ...step1, email: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone *</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="+1234567890"
            placeholderTextColor="#555"
            keyboardType="phone-pad"
            value={step1.phone}
            onChangeText={(text) => setStep1({ ...step1, phone: text })}
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Lifestyle</Text>
      <Text style={styles.stepSubtitle}>Tell us about your daily habits</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Average Sleep Hours *</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="7.5"
            placeholderTextColor="#555"
            keyboardType="numeric"
            value={step2.sleepHours}
            onChangeText={(text) => setStep2({ ...step2, sleepHours: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sleep Quality (1-5) *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={step2.sleepQuality}
            onValueChange={(value) => setStep2({ ...step2, sleepQuality: value })}
            style={styles.picker}
          >
            <Picker.Item label="1 - Very Poor" value="1" />
            <Picker.Item label="2 - Poor" value="2" />
            <Picker.Item label="3 - Average" value="3" />
            <Picker.Item label="4 - Good" value="4" />
            <Picker.Item label="5 - Excellent" value="5" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sleep Issues (Optional)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g., Insomnia, snoring..."
            placeholderTextColor="#555"
            value={step2.sleepIssues}
            onChangeText={(text) => setStep2({ ...step2, sleepIssues: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Stress Level (1-5) *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={step2.stressLevel}
            onValueChange={(value) => setStep2({ ...step2, stressLevel: value })}
            style={styles.picker}
          >
            <Picker.Item label="1 - Very Low" value="1" />
            <Picker.Item label="2 - Low" value="2" />
            <Picker.Item label="3 - Moderate" value="3" />
            <Picker.Item label="4 - High" value="4" />
            <Picker.Item label="5 - Very High" value="5" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fitness Level *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={step2.fitnessLevel}
            onValueChange={(value) => setStep2({ ...step2, fitnessLevel: value })}
            style={styles.picker}
          >
            <Picker.Item label="Select" value="" />
            <Picker.Item label="Beginner" value="beginner" />
            <Picker.Item label="Intermediate" value="intermediate" />
            <Picker.Item label="Advanced" value="advanced" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Nutrition</Text>
      <Text style={styles.stepSubtitle}>Help us understand your diet</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Diet Type *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={step3.dietType}
            onValueChange={(value) => setStep3({ ...step3, dietType: value })}
            style={styles.picker}
          >
            <Picker.Item label="Select" value="" />
            <Picker.Item label="Vegetarian" value="veg" />
            <Picker.Item label="Non-Vegetarian" value="non-veg" />
            <Picker.Item label="Vegan" value="vegan" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Allergies (Optional)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g., Nuts, dairy..."
            placeholderTextColor="#555"
            value={step3.allergies}
            onChangeText={(text) => setStep3({ ...step3, allergies: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Supplement Use (Optional)</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g., Vitamin D, Omega-3..."
            placeholderTextColor="#555"
            value={step3.supplementUse}
            onChangeText={(text) => setStep3({ ...step3, supplementUse: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hydration Level *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={step3.hydrationLevel}
            onValueChange={(value) => setStep3({ ...step3, hydrationLevel: value })}
            style={styles.picker}
          >
            <Picker.Item label="Select" value="" />
            <Picker.Item label="Low (< 1L/day)" value="low" />
            <Picker.Item label="Medium (1-2L/day)" value="medium" />
            <Picker.Item label="High (> 2L/day)" value="high" />
          </Picker>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Medical History</Text>
      <Text style={styles.stepSubtitle}>Final step - your health information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pre-existing Conditions (Optional)</Text>
        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Diabetes, hypertension..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={3}
            value={step4.conditions}
            onChangeText={(text) => setStep4({ ...step4, conditions: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Current Medications (Optional)</Text>
        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List any medications..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={3}
            value={step4.medications}
            onChangeText={(text) => setStep4({ ...step4, medications: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Family History (Optional)</Text>
        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any relevant family medical history..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={3}
            value={step4.familyHistory}
            onChangeText={(text) => setStep4({ ...step4, familyHistory: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Health Goals *</Text>
        <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What are your health and wellness goals?"
            placeholderTextColor="#555"
            multiline
            numberOfLines={4}
            value={step4.healthGoals}
            onChangeText={(text) => setStep4({ ...step4, healthGoals: text })}
          />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Lifestyle Profile',
          headerStyle: { backgroundColor: '#FAF0DC' },
          headerTintColor: '#1A1A1A',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {renderProgressBar()}

        <Text style={styles.stepIndicator}>
          Step {currentStep} of 4
        </Text>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
          onPress={currentStep === 4 ? handleSubmit : handleNext}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#556B2F', '#8FBC8F']}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 4 ? 'Submit' : 'Next'}
                </Text>
                {currentStep < 4 && (
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                )}
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  progressDot: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0C5B0',
  },
  progressDotActive: {
    backgroundColor: '#556B2F',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#556B2F',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  stepContainer: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 32,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0C5B0',
  },
  input: {
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
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0C5B0',
    overflow: 'hidden',
  },
  picker: {
    color: '#1A1A1A',
    height: 52,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FAF0DC',
    borderTopWidth: 1,
    borderTopColor: '#E0D5C0',
    gap: 12,
  },
  backButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#556B2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
