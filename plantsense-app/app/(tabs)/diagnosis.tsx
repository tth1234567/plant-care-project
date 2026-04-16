import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '../../components/AppHeader';
import { SectionTitle } from '../../components/SectionTitle';
import { PressableCard } from '../../components/PressableCard';
import { useDiagnosisStore } from '../../stores/diagnosisStore';
import { useWeatherStore } from '../../stores/weatherStore';
import { api } from '../../services/api';
import type { DiagnosisRecord } from '../../types';

export default function DiagnosisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { records, removeRecord } = useDiagnosisStore();
  const { weather, cityName, loaded, refetch } = useWeatherStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey(k => k + 1); }, []));

  const pickAndAnalyze = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('需要相机权限'); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('需要相册权限'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });
      }
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      let imageUri = asset.uri;

      // 复制到缓存目录，避免 URI 失效
      const ext = imageUri.split('.').pop() || 'jpg';
      const destUri = `${FileSystem.cacheDirectory}plant_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: imageUri, to: destUri });
      imageUri = destUri;

      setAnalyzing(true);

      // Ensure weather is available before analysis; if not loaded yet, trigger a refetch
      let currentWeather = useWeatherStore.getState().weather;
      if (!currentWeather && !loaded) {
        await refetch();
        currentWeather = useWeatherStore.getState().weather;
      }

      const currentCityName = useWeatherStore.getState().cityName;
      const weatherJson = currentWeather ? JSON.stringify(currentWeather) : undefined;

      if (!weatherJson) {
        // Non-blocking notice — analysis continues without weather
        Alert.alert(
          '提示',
          '无法获取当地天气，将基于标准环境给出养护建议。',
          [{ text: '继续', style: 'default' }],
        );
      }

      const resp = await api.analyzePlant(imageUri, { cityName: currentCityName, weatherJson });
      setAnalyzing(false);

      if (!resp.success || !resp.data) {
        Alert.alert('识别失败', resp.error || '请重试');
        return;
      }

      const record: DiagnosisRecord = {
        id: Date.now().toString(),
        imageUri,
        plantName: resp.data.plantName,
        healthScore: resp.data.healthScore,
        status: resp.data.status,
        summary: resp.data.summary,
        createdAt: new Date().toISOString(),
        analysisResult: resp.data,
      };
      await useDiagnosisStore.getState().addRecord(record);
      router.push({ pathname: '/diagnosis-result', params: { id: record.id } });
    } catch (e: any) {
      setAnalyzing(false);
      Alert.alert('出错了', e.message || '请重试');
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      {analyzing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3a9e3a" />
          <Text style={styles.loadingText}>AI 正在识别中…</Text>
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>植物诊断</Text>
        <Text style={styles.pageDesc}>拍摄或选择植物照片，AI 将分析其健康状态</Text>

        {/* 当前位置天气标识 */}
        <TouchableOpacity
          style={styles.weatherBadge}
          onPress={() => {/* AppHeader modal handles city change */}}
          activeOpacity={1}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={14} color="#0288d1" />
          <Text style={styles.weatherBadgeText}>
            {cityName || '未知城市'}
            {weather ? `  ${weather.temp}°C ${weather.text}` : '  天气加载中…'}
          </Text>
          <Text style={styles.weatherBadgeHint}>（点击顶部天气可切换城市）</Text>
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <PressableCard
            onPress={() => pickAndAnalyze(true)}
            style={[styles.actionBtn, { marginRight: 8 }]}
            disabled={analyzing}
          >
            <MaterialCommunityIcons name="camera" size={32} color="#3a9e3a" />
            <Text style={styles.actionBtnText}>拍照识别</Text>
          </PressableCard>
          <PressableCard
            onPress={() => pickAndAnalyze(false)}
            style={[styles.actionBtn, { marginLeft: 8 }]}
            disabled={analyzing}
          >
            <MaterialCommunityIcons name="image" size={32} color="#3a9e3a" />
            <Text style={styles.actionBtnText}>从相册选择</Text>
          </PressableCard>
        </View>

        {records.length > 0 && (
          <>
            <SectionTitle>诊断历史</SectionTitle>
            <View key={focusKey}>
            {records.map((record, index) => (
              <Animated.View
                key={record.id}
                entering={FadeInDown.delay(index * 60).duration(300).springify()}
              >
                <PressableCard
                  onPress={() => router.push({ pathname: '/diagnosis-result', params: { id: record.id } })}
                  style={styles.historyCard}
                >
                  <Image source={{ uri: record.imageUri }} style={styles.historyImg} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyPlant}>{record.plantName}</Text>
                    <Text style={styles.historyStatus}>{record.status}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                    </Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={[styles.score, record.healthScore >= 70 ? styles.scoreGood : styles.scoreBad]}>
                      {record.healthScore}
                    </Text>
                    <Text style={styles.scoreLabel}>健康分</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeRecord(record.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.deleteBtn}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#5a7a5a" />
                  </TouchableOpacity>
                </PressableCard>
              </Animated.View>
            ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  loadingText: { color: '#3a9e3a', fontSize: 16, marginTop: 16 },
  pageTitle: { color: '#1a2e1a', fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  pageDesc: { color: '#5a7a5a', fontSize: 13, marginBottom: 12 },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 6,
    flexWrap: 'wrap',
  },
  weatherBadgeText: { color: '#0288d1', fontSize: 13 },
  weatherBadgeHint: { color: '#4a6a4a', fontSize: 11 },
  btnRow: { flexDirection: 'row', marginBottom: 8 },
  actionBtn: {
    flex: 1, backgroundColor: '#eaf4e8', borderRadius: 14, padding: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)',
  },
  actionBtnText: { color: '#1a2e1a', fontSize: 14, fontWeight: '600', marginTop: 10 },
  historyCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)',
  },
  historyImg: { width: 52, height: 52, borderRadius: 8, marginRight: 12, backgroundColor: '#d8ecd4' },
  historyContent: { flex: 1 },
  historyPlant: { color: '#1a2e1a', fontSize: 15, fontWeight: '600' },
  historyStatus: { color: '#5a7a5a', fontSize: 12, marginTop: 2 },
  historyDate: { color: '#4a6a4a', fontSize: 11, marginTop: 2 },
  scoreBox: { alignItems: 'center', marginRight: 12 },
  score: { fontSize: 22, fontWeight: 'bold' },
  scoreGood: { color: '#3a9e3a' },
  scoreBad: { color: '#d32f2f' },
  scoreLabel: { color: '#5a7a5a', fontSize: 10 },
  deleteBtn: { padding: 4 },
});
