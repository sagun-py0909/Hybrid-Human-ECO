import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function ReportsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/reports/my`, { headers });
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = (report: any) => {
    Alert.alert(
      report.title,
      'PDF report viewing will be implemented with a PDF viewer library',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Reports',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#E8E8E8',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8FBC8F" />
        </View>
      ) : reports.length > 0 ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {reports.map((report, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reportCard}
              onPress={() => handleViewReport(report)}
            >
              <View style={styles.reportIconContainer}>
                <Ionicons name="document-text" size={32} color="#8FBC8F" />
              </View>
              <View style={styles.reportContent}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportType}>{report.reportType}</Text>
                <Text style={styles.reportDate}>
                  {format(new Date(report.date), 'MMM d, yyyy')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={80} color="#666" />
          <Text style={styles.emptyTitle}>No Reports Yet</Text>
          <Text style={styles.emptyText}>
            Your test results and health reports will appear here
          </Text>
        </View>
      )}
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
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  reportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  reportType: {
    fontSize: 13,
    color: '#8FBC8F',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
