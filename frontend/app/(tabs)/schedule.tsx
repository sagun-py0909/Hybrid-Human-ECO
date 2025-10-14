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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export default function ScheduleScreen() {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadPrograms();
  }, [selectedDate]);

  const loadPrograms = async () => {
    try {
      setIsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/programs/date/${dateStr}`, { headers });
      setPrograms(response.data);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async (programId: string, taskId: string) => {
    if (!isToday) {
      Alert.alert(
        'Cannot Complete Task',
        'Tasks can only be completed on their scheduled date. Please switch to today to mark tasks as complete.'
      );
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_URL}/programs/task/complete`,
        { programId, taskId },
        { headers }
      );
      loadPrograms();
      Alert.alert('Success', 'Task marked as complete!');
    } catch (error: any) {
      console.error('Error completing task:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to complete task';
      Alert.alert('Error', errorMsg);
    }
  };

  const getFilteredTasks = () => {
    const allTasks: any[] = [];
    programs.forEach((program) => {
      program.tasks.forEach((task: any) => {
        allTasks.push({ ...task, programId: program._id, programTitle: program.title });
      });
    });

    if (filter === 'pending') {
      return allTasks.filter((task) => !task.completed);
    } else if (filter === 'completed') {
      return allTasks.filter((task) => task.completed);
    }
    return allTasks;
  };

  const changeDate = (days: number) => {
    const newDate = days > 0 ? addDays(selectedDate, days) : subDays(selectedDate, Math.abs(days));
    setSelectedDate(newDate);
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <View style={styles.container}>
      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateButton}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
          {isToday && <Text style={styles.todayBadge}>Today</Text>}
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateButton}>
          <Ionicons name="chevron-forward" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Info Banner for non-today dates */}
      {!isToday && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#8FBC8F" />
          <Text style={styles.infoBannerText}>
            Tasks can only be completed on their scheduled date
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#556B2F" />
        </View>
      ) : (
        <ScrollView style={styles.tasksList} contentContainerStyle={styles.tasksContent}>
          {getFilteredTasks().length > 0 ? (
            getFilteredTasks().map((task, index) => (
              <View key={index} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskHeaderLeft}>
                    <TouchableOpacity
                      onPress={() =>
                        !task.completed && isToday && handleCompleteTask(task.programId, task.taskId)
                      }
                      style={[
                        styles.checkbox,
                        task.completed && styles.checkboxCompleted,
                        !isToday && !task.completed && styles.checkboxDisabled,
                      ]}
                      disabled={task.completed || !isToday}
                    >
                      {task.completed && (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                      )}
                      {!isToday && !task.completed && (
                        <Ionicons name="lock-closed" size={16} color="#888" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.taskInfo}>
                      <Text
                        style={[
                          styles.taskTitle,
                          task.completed && styles.taskTitleCompleted,
                        ]}
                      >
                        {task.title}
                      </Text>
                      <Text style={styles.taskProgram}>{task.programTitle}</Text>
                    </View>
                  </View>
                  {task.completed && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
                    </View>
                  )}
                </View>
                <View style={styles.taskBody}>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="hardware-chip" size={16} color="#8FBC8F" />
                      <Text style={styles.metaText}>{task.deviceType}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={16} color="#8FBC8F" />
                      <Text style={styles.metaText}>{task.duration}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#888" />
              <Text style={styles.emptyText}>
                {programs.length === 0
                  ? 'No programs scheduled for this day'
                  : 'No tasks match the selected filter'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0DC',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D0C5B0',
  },
  dateButton: {
    padding: 8,
  },
  dateInfo: {
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0C5B0',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C0',
  },
  infoBannerText: {
    fontSize: 13,
    color: '#8FBC8F',
    marginLeft: 8,
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  todayBadge: {
    fontSize: 12,
    color: '#8FBC8F',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FAF0DC',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: '#556B2F',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  filterTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D0C5B0',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#8FBC8F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#8FBC8F',
    borderColor: '#8FBC8F',
  },
  checkboxDisabled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#333',
    opacity: 0.5,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#4A4A4A',
  },
  taskProgram: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  completedBadge: {
    marginLeft: 8,
  },
  taskBody: {
    marginLeft: 40,
  },
  taskDescription: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#8FBC8F',
    marginLeft: 6,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
});
