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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

interface Template {
  id: string;
  name: string;
  description: string;
  tasks: any[];
}

interface Task {
  title: string;
  description: string;
  deviceType: string;
  duration: string;
}

export default function ProgramsManagement() {
  const { token } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Form state
  const [programTitle, setProgramTitle] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [customTasks, setCustomTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [templatesRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/admin/templates`, { headers }),
        axios.get(`${API_URL}/admin/users`, { headers }),
      ]);
      
      setTemplates(templatesRes.data);
      setUsers(usersRes.data.filter((u: any) => u.role === 'user'));
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setProgramTitle(template.name);
    setProgramDescription(template.description);
    setCustomTasks(template.tasks.map(t => ({
      title: t.title,
      description: t.description,
      deviceType: t.deviceType,
      duration: t.duration,
    })));
    setShowCreateModal(true);
  };

  const handleCreateCustom = () => {
    setSelectedTemplate(null);
    setProgramTitle('');
    setProgramDescription('');
    setCustomTasks([]);
    setShowCreateModal(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const addTask = () => {
    setCustomTasks([
      ...customTasks,
      { title: '', description: '', deviceType: 'Cryotherapy Chamber', duration: '3 minutes' },
    ]);
  };

  const removeTask = (index: number) => {
    setCustomTasks(customTasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    const updated = [...customTasks];
    updated[index] = { ...updated[index], [field]: value };
    setCustomTasks(updated);
  };

  const handleCreateProgram = async () => {
    if (!programTitle || !programDescription || selectedUsers.length === 0 || customTasks.length === 0 || !startDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const tasksWithIds = customTasks.map(task => ({
        ...task,
        taskId: Math.random().toString(36).substr(2, 9),
        completed: false,
        completedAt: null,
      }));

      const response = await axios.post(
        `${API_URL}/admin/programs/bulk`,
        {
          userIds: selectedUsers,
          title: programTitle,
          description: programDescription,
          tasks: tasksWithIds,
          startDate: startDate,
          weeks: weeks,
        },
        { headers }
      );

      Alert.alert(
        'Success',
        `Created ${response.data.programsCreated} programs for ${response.data.usersAssigned} users`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCreateModal(false);
              resetForm();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating program:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create program');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setProgramTitle('');
    setProgramDescription('');
    setSelectedUsers([]);
    setStartDate('');
    setWeeks(4);
    setCustomTasks([]);
    setSelectedTemplate(null);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Programs Management' }} />
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
          title: 'Programs Management',
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
        {/* Create Custom Button */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreateCustom}>
          <LinearGradient
            colors={['#556B2F', '#8FBC8F']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.createButtonText}>Create Custom Program</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Templates Section */}
        <Text style={styles.sectionTitle}>Program Templates</Text>
        <Text style={styles.sectionSubtitle}>
          Quick start with predefined wellness programs
        </Text>

        {templates.map((template, index) => (
          <View key={index} style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <Ionicons name="calendar" size={24} color="#8FBC8F" />
              <View style={styles.templateInfo}>
                <Text style={styles.templateTitle}>{template.name}</Text>
                <Text style={styles.templateDescription}>{template.description}</Text>
                <Text style={styles.templateTasks}>{template.tasks.length} tasks per day</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.useTemplateButton}
              onPress={() => handleUseTemplate(template)}
            >
              <Text style={styles.useTemplateText}>Use Template</Text>
              <Ionicons name="arrow-forward" size={16} color="#8FBC8F" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Create Program Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={28} color="#E8E8E8" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedTemplate ? 'Create from Template' : 'Create Custom Program'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Program Details */}
            <Text style={styles.formSectionTitle}>Program Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Program title"
                placeholderTextColor="#666"
                value={programTitle}
                onChangeText={setProgramTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Program description"
                placeholderTextColor="#666"
                value={programDescription}
                onChangeText={setProgramDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-10-15"
                placeholderTextColor="#666"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration *</Text>
              <View style={styles.weekSelector}>
                {[1, 4, 8, 12].map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.weekButton, weeks === w && styles.weekButtonActive]}
                    onPress={() => setWeeks(w)}
                  >
                    <Text style={[styles.weekButtonText, weeks === w && styles.weekButtonTextActive]}>
                      {w} {w === 1 ? 'Week' : 'Weeks'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tasks */}
            <Text style={styles.formSectionTitle}>Daily Tasks</Text>
            {customTasks.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <View style={styles.taskItemHeader}>
                  <Text style={styles.taskItemTitle}>Task {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeTask(index)}>
                    <Ionicons name="trash" size={20} color="#FF6B35" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Task title"
                  placeholderTextColor="#666"
                  value={task.title}
                  onChangeText={(text) => updateTask(index, 'title', text)}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  placeholderTextColor="#666"
                  value={task.description}
                  onChangeText={(text) => updateTask(index, 'description', text)}
                  multiline
                  numberOfLines={2}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Device type"
                  placeholderTextColor="#666"
                  value={task.deviceType}
                  onChangeText={(text) => updateTask(index, 'deviceType', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Duration (e.g., 3 minutes)"
                  placeholderTextColor="#666"
                  value={task.duration}
                  onChangeText={(text) => updateTask(index, 'duration', text)}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
              <Ionicons name="add-circle-outline" size={20} color="#8FBC8F" />
              <Text style={styles.addTaskText}>Add Task</Text>
            </TouchableOpacity>

            {/* User Selection */}
            <Text style={styles.formSectionTitle}>Assign to Users</Text>
            {users.map((user) => (
              <TouchableOpacity
                key={user._id}
                style={styles.userItem}
                onPress={() => toggleUserSelection(user._id)}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    selectedUsers.includes(user._id) && styles.checkboxActive,
                  ]}
                >
                  {selectedUsers.includes(user._id) && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateProgram}
              disabled={isCreating}
            >
              <LinearGradient
                colors={['#556B2F', '#8FBC8F']}
                style={styles.submitButtonGradient}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Program</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  templateCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  templateHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  templateTasks: {
    fontSize: 12,
    color: '#8FBC8F',
  },
  useTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  useTemplateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8FBC8F',
    marginRight: 4,
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
    padding: 20,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E8E8E8',
    marginTop: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E8E8E8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  weekButtonActive: {
    backgroundColor: '#556B2F',
    borderColor: '#8FBC8F',
  },
  weekButtonText: {
    fontSize: 14,
    color: '#999',
  },
  weekButtonTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  taskItem: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  taskItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8FBC8F',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addTaskText: {
    fontSize: 14,
    color: '#8FBC8F',
    marginLeft: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8FBC8F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#8FBC8F',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
