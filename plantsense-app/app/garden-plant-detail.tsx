import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGardenStore } from '../stores/gardenStore';
import { STATIC_PLANTS } from '../data/plants';
import { SectionTitle } from '../components/SectionTitle';

export default function GardenPlantDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plants, waterPlant, getPlantStatus } = useGardenStore();
  const plant = plants.find(p => p.id === id);

  if (!plant) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#5a7a5a' }}>植物不存在</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#3a9e3a' }}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getPlantStatus(plant);
  const staticInfo = STATIC_PLANTS.find(p => p.name === plant.species);

  const handleWater = () => {
    waterPlant(plant.id);
    Alert.alert('已记录', `已为「${plant.nickname}」记录浇水 💧`);
  };

  const infoItems = staticInfo ? [
    { icon: 'watering-can', label: '浇水', value: staticInfo.watering },
    { icon: 'white-balance-sunny', label: '光照', value: staticInfo.light },
    { icon: 'thermometer', label: '温度', value: staticInfo.temperature },
    { icon: 'water-percent', label: '湿度', value: staticInfo.humidity },
  ] : [];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#d4f5d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{plant.nickname}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 封面 / 大头贴 */}
        {plant.coverImage ? (
          <Image source={{ uri: plant.coverImage }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>{plant.emoji}</Text>
          </View>
        )}

        {/* 基本信息 */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.nickname}>{plant.nickname}</Text>
            <View style={[styles.statusBadge, status.needsWater && styles.statusBadgeWarn]}>
              <Text style={styles.statusText}>{status.emoji} {status.label}</Text>
            </View>
          </View>
          <Text style={styles.species}>{plant.species}</Text>
          <Text style={styles.addedAt}>
            加入花园：{new Date(plant.addedAt).toLocaleDateString('zh-CN')}
          </Text>
          {plant.lastWatered && (
            <Text style={styles.lastWatered}>
              上次浇水：{new Date(plant.lastWatered).toLocaleDateString('zh-CN')}
            </Text>
          )}
          <Text style={styles.waterInterval}>浇水间隔：每 {plant.wateringIntervalDays} 天</Text>
        </View>

        {/* 记录浇水 */}
        <TouchableOpacity onPress={handleWater} activeOpacity={0.7} style={styles.waterBtn}>
          <MaterialCommunityIcons name="watering-can" size={22} color="#0288d1" />
          <Text style={styles.waterBtnText}>记录今日浇水</Text>
        </TouchableOpacity>

        {/* 静态养护建议 */}
        {staticInfo && (
          <>
            <SectionTitle>养护指南</SectionTitle>
            <View style={styles.descCard}>
              <Text style={styles.descText}>{staticInfo.description}</Text>
            </View>
            {infoItems.map(item => (
              <View key={item.label} style={styles.careCard}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color="#3a9e3a" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.careLabel}>{item.label}</Text>
                  <Text style={styles.careValue}>{item.value}</Text>
                </View>
              </View>
            ))}
            <View style={styles.tipsCard}>
              <SectionTitle>养护贴士</SectionTitle>
              {staticInfo.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!staticInfo && (
          <View style={styles.descCard}>
            <Text style={styles.descText}>暂无该植物的静态养护资料，可以在「发现」页搜索更多信息。</Text>
          </View>
        )}
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
  coverImg: { width: '100%', height: 200, borderRadius: 14, marginBottom: 14 },
  coverPlaceholder: {
    width: '100%', height: 160, borderRadius: 14, marginBottom: 14,
    backgroundColor: '#eaf4e8', alignItems: 'center', justifyContent: 'center',
  },
  coverEmoji: { fontSize: 80 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  nickname: { color: '#1a2e1a', fontSize: 22, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#c8e8c8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeWarn: { backgroundColor: '#fde8e8' },
  statusText: { color: '#6a8a6a', fontSize: 12 },
  species: { color: '#3a9e3a', fontSize: 14, marginBottom: 6 },
  addedAt: { color: '#5a7a5a', fontSize: 12, marginBottom: 3 },
  lastWatered: { color: '#5a7a5a', fontSize: 12, marginBottom: 3 },
  waterInterval: { color: '#5a7a5a', fontSize: 12 },
  waterBtn: {
    backgroundColor: '#e8f4fd', borderRadius: 12, padding: 14, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  waterBtnText: { color: '#0288d1', fontSize: 15, fontWeight: '600' },
  descCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  descText: { color: '#3a5a3a', fontSize: 13, lineHeight: 21 },
  careCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  careLabel: { color: '#3a9e3a', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  careValue: { color: '#3a5a3a', fontSize: 13, lineHeight: 20 },
  tipsCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tipBullet: { color: '#3a9e3a', fontSize: 14, lineHeight: 20 },
  tipText: { color: '#3a5a3a', fontSize: 13, lineHeight: 20, flex: 1 },
});
