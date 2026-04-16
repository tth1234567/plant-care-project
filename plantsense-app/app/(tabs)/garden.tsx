import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '../../components/AppHeader';
import { SectionTitle } from '../../components/SectionTitle';
import { PressableCard } from '../../components/PressableCard';
import { useGardenStore } from '../../stores/gardenStore';
import { useReminderStore } from '../../stores/reminderStore';
import type { GardenPlant } from '../../types';

function PlantCard({ plant }: { plant: GardenPlant }) {
  const router = useRouter();
  const { getPlantStatus, waterPlant, removePlant } = useGardenStore();
  const { addReminder } = useReminderStore();
  const status = getPlantStatus(plant);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleWater = () => {
    waterPlant(plant.id);
    Alert.alert('已记录', `已为「${plant.nickname}」记录浇水 💧`);
  };

  const handleDelete = () => {
    Alert.alert('删除植物', `确定删除「${plant.nickname}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removePlant(plant.id) },
    ]);
  };

  const handleAddReminder = async () => {
    if (!reminderTitle.trim()) { Alert.alert('提示', '请输入提醒内容'); return; }
    if (reminderDate <= new Date()) { Alert.alert('提示', '提醒时间必须是未来时间'); return; }
    await addReminder({
      plantId: plant.id,
      plantNickname: plant.nickname ?? '',
      title: reminderTitle.trim(),
      datetime: reminderDate.toISOString(),
    });
    setShowReminderModal(false);
    setReminderTitle('');
    Alert.alert('已设置', `提醒已设置：${reminderDate.toLocaleString('zh-CN')} — ${reminderTitle}`);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/garden-plant-detail', params: { id: plant.id } })}
        activeOpacity={0.8}
        style={styles.card}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.plantEmoji}>{plant.emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.nickname}>{plant.nickname}</Text>
          <Text style={styles.species}>{plant.species}</Text>
          <Text style={styles.lastWatered}>
            {plant.lastWatered
              ? `上次浇水: ${new Date(plant.lastWatered).toLocaleDateString('zh-CN')}`
              : '还没浇过水'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, status.needsWater && styles.statusBadgeWarn]}>
            <Text style={styles.statusText}>{status.emoji} {status.label}</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); setShowReminderModal(true); }}
              activeOpacity={0.7}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="bell-plus-outline" size={18} color="#f57c00" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleWater(); }}
              activeOpacity={0.7}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="watering-can" size={18} color="#0288d1" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleDelete(); }}
              activeOpacity={0.7}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef9a9a" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* 添加提醒弹窗 */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>为「{plant.nickname}」添加提醒</Text>

            <Text style={styles.modalLabel}>提醒内容</Text>
            <TextInput
              style={styles.modalInput}
              value={reminderTitle}
              onChangeText={setReminderTitle}
              placeholder="如：浇水、施肥、换盆..."
              placeholderTextColor="#4a6a4a"
              autoFocus
            />

            <Text style={styles.modalLabel}>提醒时间</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
                style={styles.dateBtn}
              >
                <MaterialCommunityIcons name="calendar" size={16} color="#3a9e3a" />
                <Text style={styles.dateBtnText}>
                  {reminderDate.toLocaleDateString('zh-CN')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
                style={styles.dateBtn}
              >
                <MaterialCommunityIcons name="clock-outline" size={16} color="#3a9e3a" />
                <Text style={styles.dateBtnText}>
                  {reminderDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={reminderDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setReminderDate(prev => { const n = new Date(d); n.setHours(prev.getHours(), prev.getMinutes()); return n; }); }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={reminderDate}
                mode="time"
                onChange={(_, d) => { setShowTimePicker(false); if (d) setReminderDate(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }}
              />
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setShowReminderModal(false)}
                activeOpacity={0.7}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddReminder}
                activeOpacity={0.7}
                style={styles.modalConfirmBtn}
              >
                <Text style={styles.modalConfirmText}>确认设置</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default function GardenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plants } = useGardenStore();
  const { reminders, removeReminder } = useReminderStore();
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
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>🪴 我的花园</Text>
          <PressableCard
            onPress={() => router.push('/add-plant')}
            style={styles.addBtn}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#3a9e3a" />
            <Text style={styles.addBtnText}>添加植物</Text>
          </PressableCard>
        </View>

        {plants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>花园还是空的</Text>
            <Text style={styles.emptyDesc}>添加你的第一棵植物，开始记录它的成长故事</Text>
            <TouchableOpacity
              onPress={() => router.push('/add-plant')}
              activeOpacity={0.7}
              style={styles.emptyAddBtn}
            >
              <Text style={styles.emptyAddBtnText}>+ 添加植物</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View key={focusKey}>
            {plants.map((plant, i) => (
              <Animated.View key={plant.id} entering={FadeInDown.delay(i * 60).duration(300).springify()}>
                <PlantCard plant={plant} />
              </Animated.View>
            ))}
          </View>
        )}

        {/* 所有提醒列表 */}
        {reminders.length > 0 && (
          <>
            <SectionTitle>全部提醒</SectionTitle>
            {reminders.map(r => (
              <View key={r.id} style={styles.reminderCard}>
                <MaterialCommunityIcons name="bell-outline" size={18} color="#f57c00" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderTitle}>{r.title}</Text>
                  <Text style={styles.reminderMeta}>
                    {r.plantNickname ? `[${r.plantNickname}]  ` : ''}
                    {new Date(r.datetime).toLocaleString('zh-CN')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeReminder(r.id)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#5a7a5a" />
                </TouchableOpacity>
              </View>
            ))}
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { color: '#1a2e1a', fontSize: 20, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf4e8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  addBtnText: { color: '#3a9e3a', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  cardLeft: { marginRight: 12 },
  plantEmoji: { fontSize: 36 },
  cardContent: { flex: 1 },
  nickname: { color: '#1a2e1a', fontSize: 16, fontWeight: '600' },
  species: { color: '#3a9e3a', fontSize: 12, marginTop: 2 },
  lastWatered: { color: '#5a7a5a', fontSize: 11, marginTop: 4 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { backgroundColor: '#c8e8c8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeWarn: { backgroundColor: '#fde8e8' },
  statusText: { color: '#6a8a6a', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6, backgroundColor: '#d8ecd4', borderRadius: 8 },
  reminderCard: {
    backgroundColor: '#eaf4e8', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)',
  },
  reminderTitle: { color: '#1a2e1a', fontSize: 14, fontWeight: '600' },
  reminderMeta: { color: '#5a7a5a', fontSize: 11, marginTop: 3 },
  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#1a2e1a', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { color: '#5a7a5a', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyAddBtn: { backgroundColor: '#3a9e3a', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  emptyAddBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { color: '#1a2e1a', fontSize: 17, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalLabel: { color: '#5a7a5a', fontSize: 13, marginBottom: 8, marginTop: 14 },
  modalInput: {
    backgroundColor: '#f5f9f2', borderRadius: 10, padding: 14,
    color: '#1a2e1a', fontSize: 15, borderWidth: 1, borderColor: '#e8f0e8',
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: {
    flex: 1, backgroundColor: '#f5f9f2', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e8f0e8',
  },
  dateBtnText: { color: '#1a2e1a', fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, backgroundColor: '#f5f9f2', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#5a7a5a', fontSize: 15 },
  modalConfirmBtn: { flex: 1, backgroundColor: '#3a9e3a', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
