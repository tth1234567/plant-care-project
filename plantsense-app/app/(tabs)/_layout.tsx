import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../stores/authStore';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f9f2' }}>
        <ActivityIndicator color="#3a9e3a" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#2d6a2d', borderTopColor: 'rgba(255,255,255,0.2)' },
        tabBarActiveTintColor: '#a8e6a8',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: '诊断',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="stethoscope" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: '发现',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: '花园',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="flower" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
