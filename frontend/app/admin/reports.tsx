import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function ReportsManagement() {
  const { token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/users`, { headers });
      setUsers(response.data.filter((u: any) => u.role === 'user'));
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile(file);
      
      // Auto-fill report title from filename (without extension)
      if (!reportTitle && file.name) {
        const titleFromFile = file.name.replace('.pdf', '');
        setReportTitle(titleFromFile);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      if (Platform.OS === 'web') {
        // For web, fetch the file and convert to base64
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For mobile, use FileSystem
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }
    } catch (error) {
      console.error('Error converting to base64:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a PDF file');
      return;
    }

    if (!reportTitle) {
      Alert.alert('Error', 'Please enter a report title');
      return;
    }

    setIsUploading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Convert PDF to base64
      const pdfBase64 = await convertToBase64(selectedFile.uri);

      await axios.post(
        `${API_URL}/admin/reports/upload`,
        {
          userId: selectedUser,
          title: reportTitle,
          reportType: 'PDF Report',
          pdfData: pdfBase64,
        },
        { headers }
      );

      Alert.alert('Success', 'Report uploaded successfully', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedUser('');
            setReportTitle('');
            setSelectedFile(null);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error uploading report:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upload report');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Reports Management' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8FBC8F" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Reports Management',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#E8E8E8',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="document-text" size={48} color="#8FBC8F" />
          <Text style={styles.infoTitle}>Upload PDF Reports</Text>
          <Text style={styles.infoText}>
            Upload health reports, test results, or assessments for your users
          </Text>
        </View>

        {/* File Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select PDF File *</Text>
          <TouchableOpacity style={styles.filePickerButton} onPress={pickDocument}>
            <Ionicons
              name={selectedFile ? 'document' : 'cloud-upload'}
              size={24}
              color={selectedFile ? '#8FBC8F' : '#666'}
            />
            <View style={styles.filePickerContent}>
              <Text style={selectedFile ? styles.filePickerTextSelected : styles.filePickerText}>
                {selectedFile ? selectedFile.name : 'Choose PDF file'}
              </Text>
              {selectedFile && (
                <Text style={styles.fileSize}>
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Report Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter report title or name"
            placeholderTextColor="#666"
            value={reportTitle}
            onChangeText={setReportTitle}
          />
        </View>

        {/* User Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assign to User *</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.userList}>
            {filteredUsers.map((user) => (
              <TouchableOpacity
                key={user._id}
                style={[
                  styles.userCard,
                  selectedUser === user._id && styles.userCardSelected,
                ]}
                onPress={() => setSelectedUser(user._id)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedUser === user._id && styles.radioButtonActive,
                  ]}
                >
                  {selectedUser === user._id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            {filteredUsers.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#666" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            )}
          </View>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUpload}
          disabled={isUploading}
        >
          <LinearGradient
            colors={['#556B2F', '#8FBC8F']}
            style={styles.uploadButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isUploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color="#FFF" />
                <Text style={styles.uploadButtonText}>Upload Report</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 12,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  filePickerContent: {
    flex: 1,
    marginLeft: 12,
  },
  filePickerText: {
    fontSize: 16,
    color: '#666',
  },
  filePickerTextSelected: {
    fontSize: 16,
    color: '#8FBC8F',
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  userList: {
    maxHeight: 400,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  userCardSelected: {
    borderColor: '#8FBC8F',
    backgroundColor: '#1A2A1A',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#556B2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#999',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8FBC8F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: '#8FBC8F',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8FBC8F',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  uploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});
