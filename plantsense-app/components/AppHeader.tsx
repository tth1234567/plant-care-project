import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useWeatherStore } from '../stores/weatherStore';
import { useAuth } from '../stores/authStore';

export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { weather, cityName, loaded } = useWeatherStore();
  const { user } = useAuth();

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* 左：App 图标 + 名称 */}
        <View style={styles.left}>
          <MaterialCommunityIcons name="leaf" size={22} color="#a8e6a8" />
          <Text style={styles.appName}>植觉</Text>
        </View>

        {/* 中：天气（点击跳转城市选择页） */}
        <TouchableOpacity
          style={styles.center}
          onPress={() => router.push('/city-picker')}
          activeOpacity={0.7}
        >
          {!loaded ? (
            <ActivityIndicator size="small" color="#c8f0c8" />
          ) : weather ? (
            <View style={styles.weatherRow}>
              <MaterialCommunityIcons name="weather-partly-cloudy" size={16} color="#81d4fa" />
              <Text style={styles.weatherText}>
                {cityName}  {weather.temp}°C {weather.text}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color="#aacfaa" />
            </View>
          ) : (
            <View style={styles.weatherRow}>
              <Text style={styles.weatherText}>{cityName || '--'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color="#aacfaa" />
            </View>
          )}
        </TouchableOpacity>

        {/* 右：头像，点击进入个人页 */}
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={styles.avatarBtn}
          activeOpacity={0.7}
        >
          {user?.avatar ? (
            <Text style={styles.avatarEmoji}>👤</Text>
          ) : (
            <MaterialCommunityIcons name="account-circle" size={32} color="#a8e6a8" />
          )}
        </TouchableOpacity>
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(58,158,58,0.4)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 1.5 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#2d6a2d',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  appName: {
    color: '#d4f5d4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  center: {
    flex: 2,
    alignItems: 'center',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherText: {
    color: '#d4f5d4',
    fontSize: 13,
  },
  avatarBtn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  avatarEmoji: {
    fontSize: 28,
  },
});
