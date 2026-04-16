import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATIC_PLANTS } from '../data/plants';

export default function PlantDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = STATIC_PLANTS.find(p => p.id === id);

  if (!plant) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#5a7a5a' }}>植物信息不存在</Text>
      </View>
    );
  }

  const infoItems = [
    { icon: 'watering-can', label: '浇水', value: plant.watering },
    { icon: 'white-balance-sunny', label: '光照', value: plant.light },
    { icon: 'thermometer', label: '温度', value: plant.temperature },
    { icon: 'water-percent', label: '湿度', value: plant.humidity },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#d4f5d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{plant.name}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>{plant.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.plantName}>{plant.name}</Text>
            <Text style={styles.plantFamily}>{plant.family}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>简介</Text>
          <Text style={styles.cardContent}>{plant.description}</Text>
        </View>

        {infoItems.map(item => (
          <View key={item.label} style={styles.infoCard}>
            <MaterialCommunityIcons name={item.icon as any} size={22} color="#3a9e3a" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>养护小贴士</Text>
          {plant.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#2d6a2d',
  },
  headerTitle: { color: '#d4f5d4', fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  heroCard: { backgroundColor: '#eaf4e8', borderRadius: 14, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  heroEmoji: { fontSize: 56, marginRight: 16 },
  plantName: { color: '#1a2e1a', fontSize: 24, fontWeight: 'bold' },
  plantFamily: { color: '#3a9e3a', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 10 },
  cardTitle: { color: '#3a9e3a', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  cardContent: { color: '#3a5a3a', fontSize: 14, lineHeight: 22 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { color: '#3a9e3a', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  infoValue: { color: '#3a5a3a', fontSize: 13, lineHeight: 20 },
  tipRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  tipBullet: { color: '#3a9e3a', fontSize: 16, lineHeight: 22 },
  tipText: { color: '#3a5a3a', fontSize: 13, lineHeight: 22, flex: 1 },
});
