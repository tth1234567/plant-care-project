import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getLightLabel(brightness: number): { label: string; advice: string; color: string; emoji: string } {
  if (brightness >= 80) return { label: '强光', emoji: '☀️', color: '#f57c00', advice: '光线很强，适合喜阳植物（多肉、仙人掌、月季等）。注意避免灼伤叶片。' };
  if (brightness >= 55) return { label: '中等光照', emoji: '🌤', color: '#f9a825', advice: '光线充足，大多数室内植物都能良好生长，如绿萝、吊兰等。' };
  if (brightness >= 30) return { label: '散射光', emoji: '⛅', color: '#a5d6a7', advice: '散射光环境，适合耐阴植物（绿萝、虎皮兰、文竹等）。' };
  return { label: '弱光', emoji: '🌑', color: '#ef9a9a', advice: '光线较弱，长期放置可能导致植物徒长、叶色变浅，建议靠近窗户或补充人工光源。' };
}

export default function LightMeterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [brightness, setBrightness] = useState<number | null>(null);
  const [frozen, setFrozen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // 模拟亮度检测（expo-camera 不直接提供亮度值，用帧分析近似）
  const sampleBrightness = useCallback(async () => {
    if (frozen || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1,
        base64: true,
        skipProcessing: true,
      });
      if (!photo?.base64) return;
      // 取 base64 前 200 字节的平均字节值估算亮度
      const sample = photo.base64.slice(0, 200);
      let total = 0;
      for (let i = 0; i < sample.length; i++) total += sample.charCodeAt(i);
      const estimated = Math.min(100, Math.round((total / sample.length / 255) * 100 * 1.4));
      setBrightness(estimated);
    } catch { /* 采样失败忽略 */ }
  }, [frozen]);

  useEffect(() => {
    if (permission?.granted && !frozen) {
      intervalRef.current = setInterval(sampleBrightness, 1500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [permission?.granted, frozen, sampleBrightness]);

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.center]}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#4a6a4a" />
        <Text style={styles.permText}>需要相机权限才能使用光度计</Text>
        <TouchableOpacity onPress={requestPermission} activeOpacity={0.7} style={styles.permBtn}>
          <Text style={styles.permBtnText}>授予权限</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backLink}>
          <Text style={styles.backLinkText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lightInfo = brightness !== null ? getLightLabel(brightness) : null;

  return (
    <View style={styles.screen}>
      {/* 相机预览 */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={'back' as CameraType}
      />

      {/* 顶部导航 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>光度计</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 底部信息面板 */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
        {lightInfo ? (
          <>
            <View style={styles.valueRow}>
              <Text style={styles.lightEmoji}>{lightInfo.emoji}</Text>
              <View>
                <Text style={[styles.lightValue, { color: lightInfo.color }]}>{brightness}%</Text>
                <Text style={[styles.lightLabel, { color: lightInfo.color }]}>{lightInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.advice}>{lightInfo.advice}</Text>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${brightness}%` as any, backgroundColor: lightInfo.color }]} />
            </View>
          </>
        ) : (
          <Text style={styles.detectingText}>正在检测光线…</Text>
        )}

        <TouchableOpacity
          onPress={() => {
            setFrozen(f => !f);
            if (!frozen && brightness !== null) {
              Alert.alert('已记录', `当前光照：${brightness}%（${lightInfo?.label}）\n\n${lightInfo?.advice}`);
            }
          }}
          activeOpacity={0.7}
          style={[styles.freezeBtn, frozen && styles.freezeBtnActive]}
        >
          <MaterialCommunityIcons name={frozen ? 'play' : 'pause'} size={20} color="#fff" />
          <Text style={styles.freezeBtnText}>{frozen ? '继续检测' : '记录当前光照'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f9f2' },
  camera: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,31,15,0.92)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  lightEmoji: { fontSize: 48 },
  lightValue: { fontSize: 40, fontWeight: 'bold' },
  lightLabel: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  advice: { color: '#bbb', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  barBg: { height: 8, backgroundColor: '#eaf4e8', borderRadius: 4, marginBottom: 20, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  freezeBtn: {
    backgroundColor: '#3a9e3a', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  freezeBtnActive: { backgroundColor: '#2d7a2d' },
  freezeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  permText: { color: '#5a7a5a', fontSize: 14, textAlign: 'center', marginVertical: 20 },
  permBtn: { backgroundColor: '#3a9e3a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  backLink: { marginTop: 16 },
  backLinkText: { color: '#3a9e3a', fontSize: 14 },
  detectingText: { color: '#5a7a5a', fontSize: 15, textAlign: 'center', paddingVertical: 20 },
});
