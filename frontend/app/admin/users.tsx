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
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function UsersManagement() {
  const { token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/users`, { headers });
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const viewUserProgress = async (user: any) => {
    setSelectedUser(user);
    setShowProgressModal(true);
    setIsLoadingProgress(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/user/${user._id}/progress`, { headers });
      setUserProgress(response.data);
    } catch (error) {
      console.error('Error loading user progress:', error);
      Alert.alert('Error', 'Failed to load user progress');
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const exportUserData = () => {
    if (!userProgress) return;

    const csvData = [
      ['Date', 'Program', 'Task', 'Device', 'Duration', 'Completed', 'Completed At'],
      ...userProgress.taskHistory.map((task: any) => [
        task.date,
        task.programTitle,
        task.taskTitle,
        task.deviceType,
        task.duration,
        task.completed ? 'Yes' : 'No',
        task.completedAt ? format(new Date(task.completedAt), 'yyyy-MM-dd HH:mm') : '-',
      ]),
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    
    // For web, create download
    if (typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedUser.fullName}_progress_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      Alert.alert('Success', 'Data exported successfully');
    } else {
      Alert.alert('Info', 'Export is available on web version');
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    Alert.alert(
      'Update Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const headers = { Authorization: `Bearer ${token}` };
              await axios.put(
                `${API_URL}/admin/users/${userId}/role`,
                { role: newRole },
                { headers }
              );
              Alert.alert('Success', 'User role updated');
              loadUsers();
            } catch (error) {
              console.error('Error updating role:', error);
              Alert.alert('Error', 'Failed to update user role');
            }
          },
        },
      ]
    );
  };

  const deleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = { Authorization: `Bearer ${token}` };
              await axios.delete(`${API_URL}/admin/users/${userId}`, { headers });
              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Users Management' }} />
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
          title: 'Users Management',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#E8E8E8',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#E8E8E8" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {users.filter(u => u.role === 'admin').length}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {users.filter(u => u.role === 'user').length}
            </Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
        </View>

        {/* Users List */}
        <ScrollView style={styles.usersList}>
          {filteredUsers.map((user) => (
            <View key={user._id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.fullName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View
                      style={[
                        styles.roleBadge,
                        user.role === 'admin' && styles.roleBadgeAdmin,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          user.role === 'admin' && styles.roleTextAdmin,
                        ]}
                      >
                        {user.role?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.userDate}>
                      Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => viewUserProgress(user)}
                >
                  <Ionicons name="stats-chart" size={20} color="#8FBC8F" />
                  <Text style={styles.actionButtonText}>Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    updateUserRole(user._id, user.role === 'admin' ? 'user' : 'admin')
                  }
                >
                  <Ionicons name="shield" size={20} color="#4ECDC4" />
                  <Text style={styles.actionButtonText}>Role</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => deleteUser(user._id, user.fullName)}
                >
                  <Ionicons name="trash" size={20} color="#FF6B35" />
                  <Text style={[styles.actionButtonText, { color: '#FF6B35' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredUsers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Progress Modal */}
      <Modal
        visible={showProgressModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProgressModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProgressModal(false)}>
              <Ionicons name="close" size={28} color="#E8E8E8" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>User Progress</Text>
            <TouchableOpacity onPress={exportUserData}>
              <Ionicons name="download" size={24} color="#8FBC8F" />
            </TouchableOpacity>
          </View>

          {isLoadingProgress ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8FBC8F" />
            </View>
          ) : userProgress ? (
            <ScrollView style={styles.modalContent}>
              {/* User Info */}
              <View style={styles.progressHeader}>
                <Text style={styles.progressUserName}>{selectedUser?.fullName}</Text>
                <Text style={styles.progressUserEmail}>{selectedUser?.email}</Text>
              </View>

              {/* Stats Cards */}
              <View style={styles.progressStats}>
                <View style={styles.progressStatCard}>
                  <Text style={styles.progressStatValue}>
                    {userProgress.stats.completionRate}%
                  </Text>
                  <Text style={styles.progressStatLabel}>Completion Rate</Text>
                </View>
                <View style={styles.progressStatCard}>
                  <Text style={styles.progressStatValue}>
                    {userProgress.stats.currentStreak}
                  </Text>
                  <Text style={styles.progressStatLabel}>Day Streak</Text>
                </View>
                <View style={styles.progressStatCard}>
                  <Text style={styles.progressStatValue}>
                    {userProgress.stats.completedTasks}/{userProgress.stats.totalTasks}
                  </Text>
                  <Text style={styles.progressStatLabel}>Tasks Done</Text>
                </View>
              </View>

              {/* Task History */}
              <Text style={styles.historySectionTitle}>Task History</Text>
              {userProgress.taskHistory.slice(0, 50).map((task: any, index: number) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDate}>{task.date}</Text>
                    <View
                      style={[
                        styles.historyStatus,
                        task.completed && styles.historyStatusComplete,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyStatusText,
                          task.completed && styles.historyStatusTextComplete,
                        ]}
                      >
                        {task.completed ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyTaskTitle}>{task.taskTitle}</Text>
                  <Text style={styles.historyTaskMeta}>
                    {task.deviceType} • {task.duration}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#E8E8E8',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8FBC8F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#556B2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  roleBadgeAdmin: {
    backgroundColor: '#FFD70030',
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8FBC8F',
  },
  roleTextAdmin: {
    color: '#FFD700',
  },
  userDate: {
    fontSize: 12,
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8FBC8F',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressUserName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  progressUserEmail: {
    fontSize: 14,
    color: '#999',
  },
  progressStats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  progressStatCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  progressStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8FBC8F',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 16,
  },
  historyItem: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 13,
    color: '#8FBC8F',
    fontWeight: '600',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#2A2A2A',
  },
  historyStatusComplete: {
    backgroundColor: '#556B2F30',
  },
  historyStatusText: {
    fontSize: 11,
    color: '#999',
  },
  historyStatusTextComplete: {
    color: '#8FBC8F',
    fontWeight: 'bold',
  },
  historyTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  historyTaskMeta: {
    fontSize: 13,
    color: '#999',
  },
});
