import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function DeviceDetailsScreen() {
  const { deviceName } = useLocalSearchParams();
  const { token } = useAuth();
  const router = useRouter();
  const [deviceData, setDeviceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeviceDetails();
  }, [deviceName]);

  const loadDeviceDetails = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `${API_URL}/user/devices/${encodeURIComponent(deviceName as string)}/usage`,
        { headers }
      );
      setDeviceData(response.data);
    } catch (error) {
      console.error('Error loading device details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Device Details' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8FBC8F" />
        </View>
      </View>
    );
  }

  const product = deviceData?.product;
  const usageLogs = deviceData?.usageLogs || [];
  const totalSessions = usageLogs.length;
  const totalMinutes = usageLogs.reduce((sum: number, log: any) => sum + (log.duration || 0), 0);
  const averageDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Device Details',
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
        {/* Device Header */}
        <LinearGradient
          colors={['#556B2F', '#8FBC8F']}
          style={styles.deviceHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.deviceIconContainer}>
            <Ionicons name="hardware-chip" size={48} color="#FFF" />
          </View>
          <Text style={styles.deviceName}>{deviceName}</Text>
          {product && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Device Description */}
        {product && (
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>About this Device</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        )}

        {/* Usage Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#1A1A1A', '#2A2A2A']} style={styles.statCardGradient}>
              <Ionicons name="repeat" size={28} color="#8FBC8F" />
              <Text style={styles.statValue}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={['#1A1A1A', '#2A2A2A']} style={styles.statCardGradient}>
              <Ionicons name="time" size={28} color="#4ECDC4" />
              <Text style={styles.statValue}>{totalMinutes}</Text>
              <Text style={styles.statLabel}>Total Minutes</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={['#1A1A1A', '#2A2A2A']} style={styles.statCardGradient}>
              <Ionicons name="speedometer" size={28} color="#FFD700" />
              <Text style={styles.statValue}>{averageDuration}</Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Usage History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Usage History</Text>
          {usageLogs.length > 0 ? (
            usageLogs.map((log: any, index: number) => (
              <View key={index} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Ionicons name="calendar" size={20} color="#8FBC8F" />
                  <Text style={styles.logDate}>
                    {format(new Date(log.date), 'MMM d, yyyy - h:mm a')}
                  </Text>
                </View>
                <View style={styles.logBody}>
                  <View style={styles.logDetail}>
                    <Ionicons name="timer" size={16} color="#999" />
                    <Text style={styles.logText}>{log.duration} minutes</Text>
                  </View>
                  {log.notes && (
                    <View style={styles.logDetail}>
                      <Ionicons name="document-text" size={16} color="#999" />
                      <Text style={styles.logText}>{log.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>No usage history yet</Text>
              <Text style={styles.emptySubtext}>
                Your usage logs will appear here after your first session
              </Text>
            </View>
          )}
        </View>
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
    paddingBottom: 32,
  },
  deviceHeader: {
    padding: 32,
    alignItems: 'center',
  },
  deviceIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  descriptionCard: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#CCC',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  statCardGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  historySection: {
    paddingHorizontal: 20,
  },
  logCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8FBC8F',
    marginLeft: 8,
  },
  logBody: {
    paddingLeft: 28,
  },
  logDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logText: {
    fontSize: 14,
    color: '#CCC',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
