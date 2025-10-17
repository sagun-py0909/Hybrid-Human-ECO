import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

const motivationalQuotes = [
  { text: "Excellence is not a destination; it is a continuous journey.", performance: 80 },
  { text: "Your health is an investment, not an expense.", performance: 60 },
  { text: "Small daily improvements lead to stunning results.", performance: 50 },
  { text: "Consistency is the key to unlocking your potential.", performance: 40 },
  { text: "Every day is a new opportunity to improve.", performance: 0 },
];

export default function HomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [userMode, setUserMode] = useState<string>('unlocked');
  const [lifecycleFormCompleted, setLifecycleFormCompleted] = useState(false);
  const [shipmentTracking, setShipmentTracking] = useState<any>(null);
  const [dnaTracking, setDnaTracking] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [deviceUsage, setDeviceUsage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Check user mode first
      const modeRes = await axios.get(`${API_URL}/user/mode`, { headers });
      setUserMode(modeRes.data.mode);
      setLifecycleFormCompleted(modeRes.data.lifecycleFormCompleted);

      if (modeRes.data.mode === 'onboarding') {
        // Load onboarding-specific data
        const shipmentRes = await axios.get(`${API_URL}/shipment-tracking`, { headers });
        setShipmentTracking(shipmentRes.data);

        const dnaRes = await axios.get(`${API_URL}/dna-tracking`, { headers });
        setDnaTracking(dnaRes.data);
      } else {
        // Load unlocked mode data (existing functionality)
        const statsRes = await axios.get(`${API_URL}/user/stats`, { headers });
        setStats(statsRes.data);

        const programsRes = await axios.get(`${API_URL}/programs/today`, { headers });
        const allTasks: any[] = [];
        programsRes.data.forEach((program: any) => {
          program.tasks.forEach((task: any) => {
            if (!task.completed) {
              allTasks.push({ ...task, programDate: program.date });
            }
          });
        });
        setUpcomingTasks(allTasks.slice(0, 3));

        const usageRes = await axios.get(`${API_URL}/device-usage/my`, { headers });
        setDeviceUsage(usageRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const getMotivationalQuote = () => {
    const performance = stats?.completionRate || 0;
    const quote = motivationalQuotes.find(q => performance >= q.performance);
    return quote || motivationalQuotes[motivationalQuotes.length - 1];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#556B2F" />
      </View>
    );
  }


  const getShipmentStageIcon = (stage: string) => {
    const icons: any = {
      'ordered': 'cart',
      'shipped': 'airplane',
      'out_for_delivery': 'bicycle',
      'installed': 'checkmark-circle',
    };
    return icons[stage] || 'hourglass';
  };

  const getDNAStageIcon = (stage: string) => {
    const icons: any = {
      'collection_scheduled': 'calendar',
      'sample_collected': 'flask',
      'analysis_in_progress': 'analytics',
      'report_ready': 'document-text',
    };
    return icons[stage] || 'hourglass';
  };

  const formatStageName = (stage: string) => {
    return stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Render onboarding mode UI
  if (userMode === 'onboarding') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#556B2F"
          />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome to Hybrid Human,</Text>
          <Text style={styles.userName}>{user?.fullName}</Text>
        </View>

        {/* Lifecycle Form Reminder */}
        {!lifecycleFormCompleted && (
          <TouchableOpacity
            style={styles.reminderCard}
            onPress={() => router.push('/lifecycle-form')}
          >
            <View style={styles.reminderContent}>
              <Ionicons name="clipboard" size={32} color="#FF6B35" />
              <View style={styles.reminderTextContainer}>
                <Text style={styles.reminderTitle}>Complete Your Profile</Text>
                <Text style={styles.reminderText}>
                  Fill out your lifestyle form to help us personalize your wellness journey
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#556B2F" />
            </View>
          </TouchableOpacity>
        )}

        {/* Onboarding Message */}
        <View style={styles.onboardingMessage}>
          <Ionicons name="information-circle" size={24} color="#556B2F" />
          <Text style={styles.onboardingText}>
            Your wellness journey is being prepared. Track your device shipment and DNA collection below.
          </Text>
        </View>

        {/* Shipment Tracking Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Ionicons name="cube" size={24} color="#556B2F" />
            <Text style={styles.trackingTitle}>Device Shipment</Text>
          </View>
          
          {shipmentTracking && shipmentTracking.currentStage ? (
            <>
              <View style={styles.currentStageContainer}>
                <Ionicons
                  name={getShipmentStageIcon(shipmentTracking.currentStage)}
                  size={48}
                  color="#556B2F"
                />
                <Text style={styles.currentStageText}>
                  {formatStageName(shipmentTracking.currentStage)}
                </Text>
              </View>

              <View style={styles.stagesList}>
                {shipmentTracking.stages && shipmentTracking.stages.map((stage: any, index: number) => (
                  <View key={index} style={styles.stageItem}>
                    <View style={styles.stageIconContainer}>
                      <Ionicons
                        name={getShipmentStageIcon(stage.stage)}
                        size={20}
                        color="#556B2F"
                      />
                    </View>
                    <View style={styles.stageDetails}>
                      <Text style={styles.stageName}>{formatStageName(stage.stage)}</Text>
                      <Text style={styles.stageNote}>{stage.note}</Text>
                      {stage.eta && (
                        <Text style={styles.stageEta}>ETA: {stage.eta}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>Shipment tracking will be updated soon</Text>
          )}
        </View>

        {/* DNA Tracking Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Ionicons name="fitness" size={24} color="#556B2F" />
            <Text style={styles.trackingTitle}>DNA Collection</Text>
          </View>

          {/* Request DNA Collection Button */}
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => router.push('/dna-collection-request')}
          >
            <LinearGradient
              colors={['#556B2F', '#8FBC8F']}
              style={styles.requestButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flask" size={20} color="#FFF" />
              <Text style={styles.requestButtonText}>Request DNA Collection</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {dnaTracking && dnaTracking.currentStage ? (
            <>
              <View style={styles.currentStageContainer}>
                <Ionicons
                  name={getDNAStageIcon(dnaTracking.currentStage)}
                  size={48}
                  color="#556B2F"
                />
                <Text style={styles.currentStageText}>
                  {formatStageName(dnaTracking.currentStage)}
                </Text>
              </View>

              <View style={styles.stagesList}>
                {dnaTracking.stages && dnaTracking.stages.map((stage: any, index: number) => (
                  <View key={index} style={styles.stageItem}>
                    <View style={styles.stageIconContainer}>
                      <Ionicons
                        name={getDNAStageIcon(stage.stage)}
                        size={20}
                        color="#556B2F"
                      />
                    </View>
                    <View style={styles.stageDetails}>
                      <Text style={styles.stageName}>{formatStageName(stage.stage)}</Text>
                      {stage.labName && (
                        <Text style={styles.stageNote}>Lab: {stage.labName}</Text>
                      )}
                      {stage.adminNotes && (
                        <Text style={styles.stageNote}>{stage.adminNotes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>DNA tracking will be updated soon</Text>
          )}
        </View>
      </ScrollView>
    );
  }

  // Render unlocked mode UI (existing content)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#556B2F"
        />
      }
    >
      {/* Welcome Header */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.fullName}</Text>
      </View>

      {/* Motivational Quote */}
      <LinearGradient
        colors={['#556B2F', '#8FBC8F']}
        style={styles.quoteCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="star" size={24} color="#FFF" style={styles.quoteIcon} />
        <Text style={styles.quoteText}>{getMotivationalQuote().text}</Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#FFFFFF', '#D0C5B0']}
            style={styles.statCardGradient}
          >
            <Ionicons name="checkmark-circle" size={32} color="#8FBC8F" />
            <Text style={styles.statValue}>{stats?.completedTasks || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#FFFFFF', '#D0C5B0']}
            style={styles.statCardGradient}
          >
            <Ionicons name="flame" size={32} color="#FF6B35" />
            <Text style={styles.statValue}>{stats?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={['#FFFFFF', '#D0C5B0']}
            style={styles.statCardGradient}
          >
            <Ionicons name="timer" size={32} color="#4ECDC4" />
            <Text style={styles.statValue}>{stats?.totalDeviceUsage || 0}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Completion Rate */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Completion Rate</Text>
          <Text style={styles.progressPercentage}>{stats?.completionRate || 0}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${stats?.completionRate || 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressSubtext}>
          {stats?.completedTasks || 0} of {stats?.totalTasks || 0} tasks completed
        </Text>
      </View>

      {/* Upcoming Schedule */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task, index) => (
            <View key={index} style={styles.taskCard}>
              <View style={styles.taskIconContainer}>
                <Ionicons name="fitness" size={24} color="#8FBC8F" />
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {task.deviceType} • {task.duration}
                </Text>
              </View>
              <View style={styles.taskBadge}>
                <Text style={styles.taskBadgeText}>Pending</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle" size={48} color="#8FBC8F" />
            <Text style={styles.emptyText}>All tasks completed for today!</Text>
          </View>
        )}
      </View>

      {/* Recent Device Usage */}
      {deviceUsage.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {deviceUsage.map((usage, index) => (
            <View key={index} style={styles.usageCard}>
              <Ionicons name="pulse" size={20} color="#8FBC8F" />
              <View style={styles.usageContent}>
                <Text style={styles.usageDevice}>{usage.deviceType}</Text>
                <Text style={styles.usageTime}>
                  {format(new Date(usage.date), 'MMM d, yyyy')}
                </Text>
              </View>
              <Text style={styles.usageDuration}>{usage.duration}m</Text>
            </View>
          ))}
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF0DC',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quoteCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  quoteIcon: {
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    color: '#1A1A1A',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#4A4A4A',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8FBC8F',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#D0C5B0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8FBC8F',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D0C5B0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 13,
    color: '#4A4A4A',
  },
  taskBadge: {
    backgroundColor: '#D0C5B0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  taskBadgeText: {
    fontSize: 12,
    color: '#8FBC8F',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#4A4A4A',
    marginTop: 12,
  },
  usageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  usageContent: {
    flex: 1,
    marginLeft: 12,
  },
  usageDevice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  usageTime: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  usageDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8FBC8F',
  },
  // Onboarding mode styles
  reminderCard: {
    backgroundColor: '#FFF5E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  onboardingMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D0C5B0',
    gap: 12,
  },
  onboardingText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  trackingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D0C5B0',
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  currentStageContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F0E6D0',
    borderRadius: 12,
    marginBottom: 20,
  },
  currentStageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 12,
  },
  stagesList: {
    gap: 16,
  },
  stageItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0E6D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDetails: {
    flex: 1,
  },
  stageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  stageNote: {
    fontSize: 12,
    color: '#4A4A4A',
    marginBottom: 2,
  },
  stageEta: {
    fontSize: 12,
    color: '#556B2F',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  requestButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  requestButtonGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
