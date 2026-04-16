import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { PlantReminder } from '../types';

const STORAGE_KEY = 'plant_reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface ReminderStore {
  reminders: PlantReminder[];
  loaded: boolean;
  loadReminders: () => Promise<void>;
  addReminder: (reminder: Omit<PlantReminder, 'id' | 'notificationId'>) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  getTodayReminders: () => PlantReminder[];
}

async function requestNotifPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: [],
  loaded: false,

  loadReminders: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const reminders: PlantReminder[] = raw ? JSON.parse(raw) : [];
      set({ reminders, loaded: true });
    } catch {
      set({ reminders: [], loaded: true });
    }
  },

  addReminder: async (data) => {
    const id = Date.now().toString();
    let notificationId: string | undefined;

    const granted = await requestNotifPermission();
    if (granted) {
      try {
        const triggerDate = new Date(data.datetime);
        if (triggerDate > new Date()) {
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🌿 植觉提醒`,
              body: `${data.plantNickname ? `[${data.plantNickname}] ` : ''}${data.title}`,
              sound: true,
            },
            trigger: { date: triggerDate } as any,
          });
        }
      } catch (e) {
        console.log('[reminder] schedule error:', e);
      }
    }

    const reminder: PlantReminder = { ...data, id, notificationId };
    const reminders = [...get().reminders, reminder];
    set({ reminders });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  },

  removeReminder: async (id) => {
    const target = get().reminders.find(r => r.id === id);
    if (target?.notificationId) {
      try { await Notifications.cancelScheduledNotificationAsync(target.notificationId); } catch { /* ignore */ }
    }
    const reminders = get().reminders.filter(r => r.id !== id);
    set({ reminders });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  },

  getTodayReminders: () => {
    const today = new Date();
    const todayStr = today.toDateString();
    return get().reminders.filter(r => new Date(r.datetime).toDateString() === todayStr);
  },
}));
