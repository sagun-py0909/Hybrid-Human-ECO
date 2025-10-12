import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to auth screen
  return <Redirect href="/auth/login" />;
}
