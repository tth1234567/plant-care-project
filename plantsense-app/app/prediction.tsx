import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useWeatherStore } from '../stores/weatherStore';
import { useDiagnosisStore } from '../stores/diagnosisStore';
import { SectionTitle } from '../components/SectionTitle';
import type { WeatherForecastDay } from '../types';

// Map weather description to an icon name
function weatherIcon(text: string): string {
  if (text.includes('雷')) return 'weather-lightning-rainy';
  if (text.includes('雪')) return 'weather-snowy';
  if (text.includes('雨')) return 'weather-rainy';
  if (text.includes('阴')) return 'weather-cloudy';
  if (text.includes('多云') || text.includes('晴间')) return 'weather-partly-cloudy';
  if (text.includes('晴')) return 'weather-sunny';
  if (text.includes('雾')) return 'weather-fog';
  return 'weather-partly-cloudy';
}

export default function PredictionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plantName, currentScore, recordId } = useLocalSearchParams<{ plantName: string; currentScore: string; recordId: string }>();
  const { cityName, weather } = useWeatherStore();
  const { records, updatePrediction } = useDiagnosisStore();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // 优先读取缓存
      if (recordId) {
        const record = records.find(r => r.id === recordId);
        if (record?.predictionResult) {
          setResult(record.predictionResult);
          setCachedAt(record.predictionSavedAt ?? null);
          setLoading(false);
          return;
        }
      }

      // 无缓存才请求 AI
      setLoading(true);
      const weatherJson = weather ? JSON.stringify(weather) : undefined;
      const resp = await api.getPrediction(plantName || '', Number(currentScore) || 50, cityName, weatherJson);
      setLoading(false);
      if (resp.success && resp.data) {
        setResult(resp.data);
        // 写入缓存到对应诊断记录
        if (recordId) {
          await updatePrediction(recordId, resp.data);
          setCachedAt(new Date().toISOString());
        }
      } else {
        setError(resp.error || '获取预测失败');
      }
    })();
  }, []);

  const scoreColor = (s: number) => s >= 70 ? '#3a9e3a' : s >= 40 ? '#f57c00' : '#d32f2f';

  const forecast: WeatherForecastDay[] = weather?.forecast ?? [];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#d4f5d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>7 天健康预测</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3a9e3a" />
            <Text style={styles.loadingText}>AI 正在预测健康趋势…</Text>
          </View>
        )}

        {error ? (
          <View style={styles.center}>
            <Text style={{ color: '#d32f2f', fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {result && !loading && (
          <>
            {/* 缓存提示 */}
            {cachedAt && (
              <View style={styles.cacheNotice}>
                <MaterialCommunityIcons name="clock-outline" size={13} color="#5a7a5a" />
                <Text style={styles.cacheNoticeText}>
                  预测生成于 {new Date(cachedAt).toLocaleDateString('zh-CN')} {new Date(cachedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}

            {/* AI 总结 */}
            <View style={styles.summaryCard}>
              <Text style={styles.plantLabel}>{plantName}</Text>
              <Text style={styles.summaryText}>{result.summary || result.overallTrend || ''}</Text>
            </View>

            {/* 当前天气一行 */}
            {weather && (
              <View style={styles.currentWeatherCard}>
                <MaterialCommunityIcons
                  name={weatherIcon(weather.text) as any}
                  size={20}
                  color="#0288d1"
                />
                <Text style={styles.currentWeatherText}>
                  {cityName}  {weather.temp}°C {weather.text}
                  {weather.humidity ? `  湿度 ${weather.humidity}%` : ''}
                </Text>
              </View>
            )}

            {/* 7 天天气预报（真实数据） */}
            {forecast.length > 0 && (
              <>
                <SectionTitle>未来 7 天天气</SectionTitle>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.forecastScroll}
                  contentContainerStyle={styles.forecastRow}
                >
                  {forecast.map((day, i) => (
                    <View key={i} style={styles.forecastDay}>
                      <Text style={styles.forecastDate}>
                        {day.date.slice(5)}
                      </Text>
                      <MaterialCommunityIcons
                        name={weatherIcon(day.textDay) as any}
                        size={22}
                        color="#0288d1"
                        style={{ marginVertical: 4 }}
                      />
                      <Text style={styles.forecastCondition}>{day.textDay}</Text>
                      <Text style={styles.forecastTemp}>
                        {day.tempMin}~{day.tempMax}°
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {/* AI 逐日健康预测 */}
            <SectionTitle>健康趋势预测</SectionTitle>
            {(result.predictions || []).map((day: any, i: number) => {
              const realDay = forecast[i];
              return (
                <View key={i} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Text style={styles.dayDate}>{day.date || `第 ${day.day} 天`}</Text>
                      {realDay && (
                        <Text style={styles.dayWeather}>
                          {realDay.textDay}  {realDay.tempMin}~{realDay.tempMax}°C
                        </Text>
                      )}
                    </View>
                    <View style={[styles.dayScore, { borderColor: scoreColor(day.healthScore ?? day.score) }]}>
                      <Text style={[styles.dayScoreNum, { color: scoreColor(day.healthScore ?? day.score) }]}>
                        {day.healthScore ?? day.score}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dayDesc}>{day.description || day.status || ''}</Text>
                  {(day.actions || []).map((a: string, j: number) => (
                    <View key={j} style={styles.actionRow}>
                      <Text style={styles.actionBullet}>•</Text>
                      <Text style={styles.actionText}>{a}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </>
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
  center: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#3a9e3a', fontSize: 14, marginTop: 16 },
  summaryCard: { backgroundColor: '#eaf4e8', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  plantLabel: { color: '#3a9e3a', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  summaryText: { color: '#3a5a3a', fontSize: 14, lineHeight: 22 },
  currentWeatherCard: {
    backgroundColor: '#e8f4fd', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  currentWeatherText: { color: '#0288d1', fontSize: 13 },
  cacheNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 8, paddingHorizontal: 2,
  },
  cacheNoticeText: { color: '#5a7a5a', fontSize: 11 },
  forecastScroll: { marginBottom: 16 },
  forecastRow: { gap: 8, paddingBottom: 4 },
  forecastDay: {
    backgroundColor: '#e8f4fd', borderRadius: 10, padding: 10,
    alignItems: 'center', minWidth: 68,
  },
  forecastDate: { color: '#6a8a6a', fontSize: 12, marginBottom: 2 },
  forecastCondition: { color: '#3a5a3a', fontSize: 11, textAlign: 'center', marginBottom: 2 },
  forecastTemp: { color: '#0288d1', fontSize: 12, fontWeight: '600' },
  dayCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  dayHeaderLeft: { flex: 1 },
  dayDate: { color: '#1a2e1a', fontSize: 14, fontWeight: '600' },
  dayWeather: { color: '#0288d1', fontSize: 11, marginTop: 2 },
  dayScore: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  dayScoreNum: { fontSize: 14, fontWeight: 'bold' },
  dayDesc: { color: '#6a8a6a', fontSize: 13, lineHeight: 20, marginBottom: 6 },
  actionRow: { flexDirection: 'row', gap: 6, marginBottom: 3 },
  actionBullet: { color: '#3a9e3a', fontSize: 14 },
  actionText: { color: '#3a5a3a', fontSize: 12, lineHeight: 18, flex: 1 },
});
