import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '../../components/AppHeader';
import { SectionTitle } from '../../components/SectionTitle';
import { PressableCard } from '../../components/PressableCard';
import { useGardenStore } from '../../stores/gardenStore';
import { useReminderStore } from '../../stores/reminderStore';
import { useAuth } from '../../stores/authStore';
import { CARE_TIPS } from '../../data/plants';
import type { GardenPlant, PlantPersonality } from '../../types';

// 各性格对应的话术库
const PERSONALITY_LINES: Record<PlantPersonality, Record<string, string[]>> = {
  lively: {
    needsWater: ['我渴死啦！快来救我！💧💧', '呜呜呜好渴好渴，快浇水！', '主人！我要喝水！！！'],
    tomorrow: ['明天就该浇水啦，别忘了我哦～', '快了快了，明天记得来！✨'],
    good: ['今天状态超棒！开心！🎉', '我很好很好！谢谢你的照顾！😊', '哇今天阳光真好，我好快乐！🌞'],
    noRecord: ['还不知道我喝没喝水呢，你记一下呗～', '我的浇水记录还是空的哦！'],
  },
  cool: {
    needsWater: ['缺水。', '水不够了。', '……需要浇水了。'],
    tomorrow: ['明天浇水。', '快了。'],
    good: ['还行。', '状态尚可。', '没什么问题。'],
    noRecord: ['没有浇水记录。', '数据缺失。'],
  },
  elegant: {
    needsWater: ['轻声细语，我在等待甘露的滋润…', '干涸许久，期待一场细雨…', '若能饮水，余生皆安。'],
    tomorrow: ['明日应当施以甘霖，莫要忘怀。', '时候将至，一点清泉便是恩典。'],
    good: ['今日尚好，安然自在。', '岁月静好，感谢关怀。', '一切如常，清风徐来。'],
    noRecord: ['浇水之事，尚无记录，还请留意。', '往昔几度饮水，已无从考证。'],
  },
};

function getPersonalityLine(personality: PlantPersonality, key: string): string {
  const lines = PERSONALITY_LINES[personality]?.[key] || PERSONALITY_LINES.lively[key] || ['状态良好'];
  return lines[Math.floor(Math.random() * lines.length)];
}

function PlantBubble({ plant, index }: { plant: GardenPlant; index: number }) {
  const { getPlantStatus } = useGardenStore();
  const status = getPlantStatus(plant);
  const personality = plant.personality || 'lively';

  let msgKey = 'good';
  if (status.needsWater) msgKey = 'needsWater';
  else if (status.label === '明天浇水') msgKey = 'tomorrow';
  else if (status.label === '未记录浇水') msgKey = 'noRecord';

  const message = getPersonalityLine(personality, msgKey);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(350).springify()}
      style={styles.bubbleRow}
    >
      <View style={styles.bubbleAvatar}>
        <Text style={styles.bubbleEmoji}>{plant.emoji}</Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleName}>{plant.nickname}</Text>
        <Text style={styles.bubbleMsg}>{message}</Text>
        <Text style={styles.bubbleSpecies}>{plant.species}</Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plants } = useGardenStore();
  const { getTodayReminders } = useReminderStore();
  const { user } = useAuth();
  const todayReminders = getTodayReminders();
  const waterNeeded = plants.filter(p => useGardenStore.getState().getPlantStatus(p).needsWater).length;
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey(k => k + 1); }, []));

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#c8e8c0', '#d0eaca']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overviewCard}
        >
          <Text style={styles.overviewGreeting}>你好，{user?.nickname || '植物爱好者'} 🌱</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <MaterialCommunityIcons name="water-outline" size={18} color="#0288d1" />
              <Text style={styles.overviewNum}>{waterNeeded}</Text>
              <Text style={styles.overviewLabel}>待浇水</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <MaterialCommunityIcons name="bell-outline" size={18} color="#f57c00" />
              <Text style={styles.overviewNum}>{todayReminders.length}</Text>
              <Text style={styles.overviewLabel}>今日提醒</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 今日植览 */}
        <SectionTitle>今日植览</SectionTitle>
        {plants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>花园里还没有植物，去添加一棵吧~</Text>
            <TouchableOpacity onPress={() => router.push('/add-plant')} activeOpacity={0.7} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ 添加植物</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View key={focusKey}>
            {plants.map((plant, i) => <PlantBubble key={plant.id} plant={plant} index={i} />)}
          </View>
        )}

        {/* 识别植物 */}
        <SectionTitle>识别植物</SectionTitle>
        <PressableCard onPress={() => router.push('/(tabs)/diagnosis')}>
          <LinearGradient
            colors={['#c8e8c0', '#d4eccc']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.identifyCard}
          >
            <View style={styles.identifyAccent} />
            <MaterialCommunityIcons name="camera" size={32} color="#3a9e3a" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.identifyTitle}>拍照识别</Text>
              <Text style={styles.identifyDesc}>AI 分析植物种类、健康状态和养护建议</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#4a6a4a" />
          </LinearGradient>
        </PressableCard>

        {/* 今日提醒 + 光度计 */}
        <View style={styles.toolRow}>
          <PressableCard
            onPress={() => router.push('/(tabs)/garden')}
            style={[styles.toolCard, { marginRight: 8 }]}
          >
            <MaterialCommunityIcons name="bell-outline" size={28} color="#f57c00" />
            <Text style={styles.toolTitle}>今日提醒</Text>
            {todayReminders.length > 0 ? (
              todayReminders.slice(0, 2).map(r => (
                <Text key={r.id} style={styles.reminderItem} numberOfLines={1}>• {r.title}</Text>
              ))
            ) : (
              <Text style={styles.toolDesc}>{waterNeeded > 0 ? `${waterNeeded} 棵植物需要浇水` : '今天暂无提醒'}</Text>
            )}
          </PressableCard>
          <PressableCard
            onPress={() => router.push('/light-meter')}
            style={[styles.toolCard, { marginLeft: 8 }]}
          >
            <MaterialCommunityIcons name="white-balance-sunny" size={28} color="#f9a825" />
            <Text style={styles.toolTitle}>光度计</Text>
            <Text style={styles.toolDesc}>检测当前环境光照</Text>
          </PressableCard>
        </View>

        {/* 养护小贴士 */}
        <SectionTitle>养护小贴士</SectionTitle>
        {CARE_TIPS.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{tip.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipContent}>{tip.content}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  overviewCard: {
    borderRadius: 16, padding: 18, marginBottom: 4,
    borderWidth: 1, borderColor: 'rgba(58,158,58,0.22)',
    elevation: 2,
  },
  overviewGreeting: { color: '#1a2e1a', fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  overviewItem: { flex: 1, alignItems: 'center', gap: 4 },
  overviewNum: { color: '#1a2e1a', fontSize: 22, fontWeight: 'bold' },
  overviewLabel: { color: '#5a7a5a', fontSize: 12 },
  overviewDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  emptyText: { color: '#5a7a5a', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  addBtn: { backgroundColor: '#3a9e3a', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  bubbleAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#eaf4e8', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  bubbleEmoji: { fontSize: 24 },
  bubble: {
    flex: 1, backgroundColor: '#eaf4e8', borderRadius: 12, borderTopLeftRadius: 4,
    padding: 12, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)',
    elevation: 3,
    shadowColor: '#3a9e3a', shadowOpacity: 0.18, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleName: { color: '#3a9e3a', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  bubbleMsg: { color: '#1a2e1a', fontSize: 14, lineHeight: 20 },
  bubbleSpecies: { color: '#4a6a4a', fontSize: 11, marginTop: 4 },
  identifyCard: {
    borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(58,158,58,0.25)',
  },
  identifyAccent: {
    width: 3, alignSelf: 'stretch', backgroundColor: '#3a9e3a',
    borderRadius: 2, marginRight: 12,
  },
  identifyTitle: { color: '#1a2e1a', fontSize: 16, fontWeight: '600' },
  identifyDesc: { color: '#5a7a5a', fontSize: 12, marginTop: 2 },
  toolRow: { flexDirection: 'row', marginTop: 4 },
  toolCard: { flex: 1, backgroundColor: '#eaf4e8', borderRadius: 12, padding: 16, alignItems: 'center', minHeight: 100, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  toolTitle: { color: '#1a2e1a', fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  toolDesc: { color: '#5a7a5a', fontSize: 11, textAlign: 'center' },
  reminderItem: { color: '#f57c00', fontSize: 11, textAlign: 'center', marginTop: 2 },
  tipCard: {
    backgroundColor: '#eaf4e8', borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)',
  },
  tipEmoji: { fontSize: 22, marginRight: 12, marginTop: 2 },
  tipTitle: { color: '#3a9e3a', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  tipContent: { color: '#5a7a5a', fontSize: 12, lineHeight: 18 },
});
