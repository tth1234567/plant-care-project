import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWeatherStore, PRESET_CITIES, type CityOption } from '../stores/weatherStore';

export default function CityPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cityName, setCity } = useWeatherStore();

  const handleSelect = async (city: CityOption) => {
    router.back();
    await setCity(city);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>选择城市</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={24} color="#3a5a3a" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={PRESET_CITIES}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, cityName === item.name && styles.rowActive]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cityText, cityName === item.name && styles.cityTextActive]}>
              {item.name}
            </Text>
            {cityName === item.name && (
              <MaterialCommunityIcons name="check" size={20} color="#3a9e3a" />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f9f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58,158,58,0.15)',
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#1a2e1a',
    fontSize: 17,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(58,158,58,0.1)',
    backgroundColor: '#ffffff',
  },
  rowActive: {
    backgroundColor: 'rgba(58,158,58,0.08)',
  },
  cityText: {
    color: '#3a5a3a',
    fontSize: 16,
  },
  cityTextActive: {
    color: '#3a9e3a',
    fontWeight: '600',
  },
});
