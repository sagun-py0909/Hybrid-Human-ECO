import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DrawerLayout from '../../components/DrawerLayout';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DrawerLayout>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: '#FAF0DC',
            },
          }}
        >
          <Stack.Screen name="home" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="contact" />
          <Stack.Screen name="profile" />
        </Stack>
      </DrawerLayout>
    </GestureHandlerRootView>
  );
}
