import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function ProfileScreen() {
  const { user, logout, isAdmin, token } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/user/devices`, { headers });
      setDevices(response.data.devices);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'document-text',
      title: 'View Reports',
      description: 'Access your test results and reports',
      onPress: () => router.push('/reports'),
      color: '#8FBC8F',
    },
    {
      icon: 'flask',
      title: 'Schedule a Test',
      description: 'Book health assessment and testing',
      onPress: () => router.push('/schedule-test'),
      color: '#4ECDC4',
    },
    {
      icon: 'chatbubbles',
      title: 'Contact Us',
      description: 'Get in touch with our support team',
      onPress: () => router.push('/(tabs)/contact'),
      color: '#FF6B35',
    },
  ];

  if (isAdmin) {
    menuItems.push({
      icon: 'shield',
      title: 'Admin Panel',
      description: 'Manage users, programs, and support',
      onPress: () => router.push('/admin'),
      color: '#FFD700',
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* User Profile Card */}
      <LinearGradient
        colors={['#556B2F', '#8FBC8F']}
        style={styles.profileCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>{user?.fullName}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#000" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </LinearGradient>

      {/* My Devices Section */}
      {isLoadingDevices ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Devices</Text>
          <ActivityIndicator size="small" color="#8FBC8F" />
        </View>
      ) : devices.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Devices</Text>
          {devices.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceCard}
              onPress={() => router.push(`/device-details?deviceName=${encodeURIComponent(device.name)}`)}
            >
              <View style={styles.deviceIconContainer}>
                <Ionicons name="hardware-chip" size={32} color="#8FBC8F" />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceCategory}>{device.category}</Text>
                {device.totalSessions > 0 && (
                  <Text style={styles.deviceStats}>
                    {device.totalSessions} sessions • {device.totalMinutes} mins
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#FF6B35" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Hybrid Human v1.0.0</Text>
        <Text style={styles.appInfoText}>Premium Wellness Platform</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0DC',
  },
  contentContainer: {
    padding: 20,
  },
  profileCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D0C5B0',
  },
  deviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D0C5B0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  deviceCategory: {
    fontSize: 13,
    color: '#8FBC8F',
    marginBottom: 4,
  },
  deviceStats: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: '#4A4A4A',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
});
