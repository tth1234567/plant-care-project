import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGardenStore } from '../stores/gardenStore';
import { api } from '../services/api';
import { STATIC_PLANTS } from '../data/plants';
import type { GardenPlant, PlantPersonality } from '../types';

const PLANT_EMOJIS = ['🌿', '🪴', '🌱', '🌹', '🌵', '🎋', '🌸', '🌻', '🍀', '🪷'];

const PERSONALITY_OPTIONS: { value: PlantPersonality; label: string; desc: string; emoji: string }[] = [
  { value: 'lively', label: '开心活泼', desc: '充满活力，喜欢用感叹号和 emoji 说话', emoji: '😊' },
  { value: 'cool', label: '傲气冷酷', desc: '话少但有态度，偶尔抱怨', emoji: '😎' },
  { value: 'elegant', label: '优雅内敛', desc: '语气温婉，带点文学气息', emoji: '🌸' },
];

type AddMode = 'choose' | 'manual' | 'photo';

export default function AddPlantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addPlant } = useGardenStore();

  const [mode, setMode] = useState<AddMode>('choose');
  const [nickname, setNickname] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🌿');
  const [wateringDays, setWateringDays] = useState('7');
  const [personality, setPersonality] = useState<PlantPersonality>('lively');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);

  const handlePhotoAdd = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const permLib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permLib.granted) { Alert.alert('需要相机或相册权限'); return; }
    }
    const result = perm.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() || 'jpg';
    const destUri = `${FileSystem.cacheDirectory}plant_add_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: asset.uri, to: destUri });
    setCoverImage(destUri);

    setIdentifying(true);
    const resp = await api.analyzePlant(destUri);
    setIdentifying(false);

    if (resp.success && resp.data) {
      const identified = (resp.data as any).plantName || '';
      if (identified) {
        setSelectedSpecies(identified);
        Alert.alert('识别成功', `AI 识别为：${identified}\n请确认或手动修改种类`);
      } else {
        Alert.alert('未识别', '未能识别植物种类，请手动选择');
      }
    } else {
      Alert.alert('识别失败', resp.error || '请手动选择种类');
    }
    setMode('manual');
  };

  const handleAdd = async () => {
    if (!nickname.trim()) { Alert.alert('提示', '请给植物起个昵称'); return; }
    if (!selectedSpecies) { Alert.alert('提示', '请选择植物种类'); return; }
    const plant: GardenPlant = {
      id: Date.now().toString(),
      nickname: nickname.trim(),
      species: selectedSpecies,
      emoji: selectedEmoji,
      coverImage: coverImage || undefined,
      addedAt: new Date().toISOString(),
      lastWatered: null,
      wateringIntervalDays: parseInt(wateringDays) || 7,
      reminderEnabled: false,
      personality,
    };
    await addPlant(plant);
    Alert.alert('添加成功', `「${plant.nickname}」已加入你的花园 🌱`, [
      { text: '好的', onPress: () => router.back() },
    ]);
  };

  if (mode === 'choose') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#d4f5d4" />
          </TouchableOpacity>
          <Text style={styles.title}>添加植物</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.chooseSection}>
          <Text style={styles.chooseHint}>选择添加方式</Text>
          <TouchableOpacity onPress={() => setMode('manual')} activeOpacity={0.7} style={styles.chooseCard}>
            <MaterialCommunityIcons name="pencil" size={36} color="#3a9e3a" />
            <Text style={styles.chooseTitle}>输入名称添加</Text>
            <Text style={styles.chooseDesc}>从预设列表选择植物种类，手动填写信息</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePhotoAdd} activeOpacity={0.7} style={styles.chooseCard}>
            {identifying ? (
              <ActivityIndicator size="large" color="#3a9e3a" />
            ) : (
              <MaterialCommunityIcons name="camera" size={36} color="#3a9e3a" />
            )}
            <Text style={styles.chooseTitle}>拍照识别添加</Text>
            <Text style={styles.chooseDesc}>拍摄植物照片，AI 自动识别种类并作为封面</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('choose')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#d4f5d4" />
          </TouchableOpacity>
          <Text style={styles.title}>添加植物</Text>
          <View style={{ width: 26 }} />
        </View>

        {coverImage && (
          <View style={styles.coverWrap}>
            <Image source={{ uri: coverImage }} style={styles.coverImg} resizeMode="cover" />
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>封面照片</Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>昵称</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="给你的植物起个名字"
          placeholderTextColor="#4a6a4a"
        />

        <Text style={styles.label}>选择表情</Text>
        <View style={styles.emojiRow}>
          {PLANT_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              onPress={() => setSelectedEmoji(e)}
              activeOpacity={0.7}
              style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>植物种类</Text>
        {selectedSpecies && !STATIC_PLANTS.find(p => p.name === selectedSpecies) && (
          <View style={styles.aiSpeciesCard}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#3a9e3a" />
            <Text style={styles.aiSpeciesText}>AI 识别：{selectedSpecies}</Text>
          </View>
        )}
        {STATIC_PLANTS.map(plant => (
          <TouchableOpacity
            key={plant.id}
            onPress={() => setSelectedSpecies(plant.name)}
            activeOpacity={0.7}
            style={[styles.speciesBtn, selectedSpecies === plant.name && styles.speciesBtnActive]}
          >
            <Text style={styles.speciesEmoji}>{plant.emoji}</Text>
            <Text style={[styles.speciesName, selectedSpecies === plant.name && styles.speciesNameActive]}>
              {plant.name}
            </Text>
            {selectedSpecies === plant.name && (
              <MaterialCommunityIcons name="check" size={18} color="#3a9e3a" style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>植物性格</Text>
        {PERSONALITY_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setPersonality(opt.value)}
            activeOpacity={0.7}
            style={[styles.personalityBtn, personality === opt.value && styles.personalityBtnActive]}
          >
            <Text style={styles.personalityEmoji}>{opt.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.personalityLabel, personality === opt.value && styles.personalityLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.personalityDesc}>{opt.desc}</Text>
            </View>
            {personality === opt.value && (
              <MaterialCommunityIcons name="check" size={18} color="#3a9e3a" />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>浇水间隔（天）</Text>
        <TextInput
          style={styles.input}
          value={wateringDays}
          onChangeText={setWateringDays}
          keyboardType="number-pad"
          placeholder="7"
          placeholderTextColor="#4a6a4a"
        />

        <TouchableOpacity onPress={handleAdd} activeOpacity={0.8} style={styles.addBtn}>
          <Text style={styles.addBtnText}>添加到花园</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 20, paddingTop: 4 },
  title: { color: '#1a2e1a', fontSize: 18, fontWeight: 'bold' },
  chooseSection: { flex: 1, padding: 20, justifyContent: 'center', gap: 16, marginTop: 20 },
  chooseHint: { color: '#5a7a5a', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  chooseCard: {
    backgroundColor: '#eaf4e8', borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 10,
  },
  chooseTitle: { color: '#1a2e1a', fontSize: 17, fontWeight: '600' },
  chooseDesc: { color: '#5a7a5a', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  coverWrap: { marginBottom: 16, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  coverImg: { width: '100%', height: 180 },
  coverBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  coverBadgeText: { color: '#fff', fontSize: 11 },
  label: { color: '#6a8a6a', fontSize: 13, marginBottom: 8, marginTop: 18 },
  input: {
    backgroundColor: '#ffffff', borderRadius: 10, padding: 14,
    color: '#1a2e1a', fontSize: 15, borderWidth: 1, borderColor: '#e8f0e8',
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: '#3a9e3a' },
  emojiText: { fontSize: 24 },
  aiSpeciesCard: {
    backgroundColor: '#dff0db', borderRadius: 8, padding: 10, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  aiSpeciesText: { color: '#3a9e3a', fontSize: 14 },
  speciesBtn: {
    backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent',
  },
  speciesBtnActive: { borderColor: '#3a9e3a', backgroundColor: '#eaf4e8' },
  speciesEmoji: { fontSize: 24, marginRight: 12 },
  speciesName: { color: '#6a8a6a', fontSize: 15 },
  speciesNameActive: { color: '#3a9e3a', fontWeight: '600' },
  personalityBtn: {
    backgroundColor: '#ffffff', borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'transparent',
  },
  personalityBtnActive: { borderColor: '#3a9e3a', backgroundColor: '#eaf4e8' },
  personalityEmoji: { fontSize: 28 },
  personalityLabel: { color: '#6a8a6a', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  personalityLabelActive: { color: '#3a9e3a' },
  personalityDesc: { color: '#5a7a5a', fontSize: 12 },
  addBtn: { backgroundColor: '#3a9e3a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
