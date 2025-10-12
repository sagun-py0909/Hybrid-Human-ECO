import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function AdminDashboard() {
  const { user, token, isAdmin } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  if (!isAdmin) {
    return <Redirect href="/(tabs)/home" />;
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/analytics`, { headers });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const adminSections = [
    {
      title: 'Users',
      icon: 'people',
      color: '#8FBC8F',
      route: '/admin/users',
      stat: analytics?.totalUsers || 0,
      statLabel: 'Total Users',
    },
    {
      title: 'Programs',
      icon: 'calendar',
      color: '#4ECDC4',
      route: '/admin/programs',
      stat: analytics?.totalPrograms || 0,
      statLabel: 'Active Programs',
    },
    {
      title: 'Reports',
      icon: 'document-text',
      color: '#FF6B35',
      route: '/admin/reports',
      statLabel: 'Upload Reports',
    },
    {
      title: 'Tickets',
      icon: 'help-circle',
      color: '#FFD700',
      route: '/admin/tickets',
      stat: analytics?.openTickets || 0,
      statLabel: 'Open Tickets',
    },
    {
      title: 'Call Requests',
      icon: 'call',
      color: '#9B59B6',
      route: '/admin/call-requests',
      stat: analytics?.pendingCalls || 0,
      statLabel: 'Pending Calls',
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Admin Panel', headerShown: true }} />
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
          title: 'Admin Panel',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#E8E8E8',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8FBC8F" />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, Admin</Text>
          <Text style={styles.subtitle}>Manage your wellness platform</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics?.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics?.openTickets || 0}</Text>
            <Text style={styles.statLabel}>Open Tickets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics?.pendingCalls || 0}</Text>
            <Text style={styles.statLabel}>Pending Calls</Text>
          </View>
        </View>

        {/* Admin Sections */}
        <Text style={styles.sectionTitle}>Management</Text>
        {adminSections.map((section, index) => (
          <TouchableOpacity
            key={index}
            style={styles.sectionCard}
            onPress={() => router.push(section.route as any)}
          >
            <View style={[styles.sectionIcon, { backgroundColor: `${section.color}20` }]}>
              <Ionicons name={section.icon as any} size={28} color={section.color} />
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle2}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.statLabel}</Text>
            </View>
            <View style={styles.sectionRight}>
              {section.stat !== undefined && (
                <Text style={styles.sectionStat}>{section.stat}</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        ))}
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
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8FBC8F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 16,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle2: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionStat: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8FBC8F',
    marginRight: 8,
  },
});
