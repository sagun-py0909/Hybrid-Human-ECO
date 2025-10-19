import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export default function DrawerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useSharedValue(-DRAWER_WIDTH);

  const menuItems = [
    { icon: 'home', label: 'Home', path: '/home', color: '#556B2F' },
    { icon: 'calendar', label: 'Schedule', path: '/schedule', color: '#8FBC8F' },
    { icon: 'chatbubbles', label: 'Contact', path: '/contact', color: '#FF6B35' },
    { icon: 'person', label: 'Profile', path: '/profile', color: '#4ECDC4' },
    { icon: 'cube', label: 'Products', path: '/product-catalog', color: '#556B2F' },
    { icon: 'document-text', label: 'Reports', path: '/reports', color: '#8FBC8F' },
    { icon: 'flask', label: 'Schedule Test', path: '/schedule-test', color: '#4ECDC4' },
  ];

  const toggleDrawer = () => {
    if (isOpen) {
      translateX.value = withSpring(-DRAWER_WIDTH, {
        damping: 20,
        stiffness: 90,
      });
      setIsOpen(false);
    } else {
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      setIsOpen(true);
    }
  };

  const closeDrawer = () => {
    if (isOpen) {
      translateX.value = withSpring(-DRAWER_WIDTH, {
        damping: 20,
        stiffness: 90,
      });
      setIsOpen(false);
    }
  };

  const handleNavigate = (path) => {
    closeDrawer();
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  const handleLogout = async () => {
    closeDrawer();
    setTimeout(async () => {
      await logout();
      router.replace('/auth/login');
    }, 300);
  };

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-DRAWER_WIDTH, 0],
      [0, 0.5]
    ),
    pointerEvents: isOpen ? 'auto' : 'none',
  }));

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(-DRAWER_WIDTH, event.translationX);
      } else if (isOpen) {
        translateX.value = Math.min(0, -DRAWER_WIDTH + event.translationX);
      }
    })
    .onEnd((event) => {
      if (event.velocityX < -500 || event.translationX < -DRAWER_WIDTH / 2) {
        translateX.value = withSpring(-DRAWER_WIDTH);
        setIsOpen(false);
      } else {
        translateX.value = withSpring(0);
        setIsOpen(true);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        {/* Main Content */}
        <View style={styles.content}>
          {/* Header with Hamburger */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.hamburger}
              onPress={toggleDrawer}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isOpen ? 'close' : 'menu'}
                size={28}
                color="#1A1A1A"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hybrid Human</Text>
            <View style={styles.headerRight}>
              <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            </View>
          </View>

          {children}
        </View>

        {/* Overlay */}
        <Animated.View
          style={[styles.overlay, overlayAnimatedStyle]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </Animated.View>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
          <ScrollView contentContainerStyle={styles.drawerContent}>
            {/* User Profile Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.userName}>{user?.fullName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
              {menuItems.map((item, index) => {
                const isActive = pathname.includes(item.path.split('/')[1]);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.menuItem,
                      isActive && styles.menuItemActive,
                    ]}
                    onPress={() => handleNavigate(item.path)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.menuIconContainer,
                        { backgroundColor: `${item.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isActive ? item.color : '#4A4A4A'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.menuLabel,
                        isActive && styles.menuLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={22} color="#FF6B35" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* App Version */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Hybrid Human v1.0</Text>
              <Text style={styles.footerSubtext}>Premium Wellness Platform</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0DC',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF0DC',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C0',
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
      android: {
        paddingTop: 12,
      },
    }),
  },
  hamburger: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerRight: {
    padding: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  drawerContent: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
  },
  drawerHeader: {
    padding: 20,
    backgroundColor: '#556B2F',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8FBC8F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#E8E8E8',
  },
  menuSection: {
    paddingVertical: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemActive: {
    backgroundColor: '#F0E6D0',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 4,
  },
});
