import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import type { GardenPlant, WateringRecord } from '../types';

interface GardenStore {
  plants: GardenPlant[];
  wateringRecords: WateringRecord[];
  loaded: boolean;
  loadGarden: () => Promise<void>;
  addPlant: (plant: GardenPlant) => Promise<void>;
  removePlant: (id: string) => Promise<void>;
  updatePlant: (id: string, updates: Partial<GardenPlant>) => Promise<void>;
  waterPlant: (plantId: string) => Promise<void>;
  getPlantStatus: (plant: GardenPlant) => { label: string; emoji: string; needsWater: boolean };
}

async function savePlants(plants: GardenPlant[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.GARDEN_PLANTS, JSON.stringify(plants));
}

export const useGardenStore = create<GardenStore>((set, get) => ({
  plants: [],
  wateringRecords: [],
  loaded: false,

  loadGarden: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GARDEN_PLANTS);
      const plants: GardenPlant[] = raw ? JSON.parse(raw) : [];
      const rawRecords = await AsyncStorage.getItem('watering_records');
      const wateringRecords: WateringRecord[] = rawRecords ? JSON.parse(rawRecords) : [];
      set({ plants, wateringRecords, loaded: true });
    } catch {
      set({ plants: [], wateringRecords: [], loaded: true });
    }
  },

  addPlant: async (plant) => {
    const plants = [...get().plants, plant];
    set({ plants });
    await savePlants(plants);
  },

  removePlant: async (id) => {
    const plants = get().plants.filter(p => p.id !== id);
    set({ plants });
    await savePlants(plants);
  },

  updatePlant: async (id, updates) => {
    const plants = get().plants.map(p => p.id === id ? { ...p, ...updates } : p);
    set({ plants });
    await savePlants(plants);
  },

  waterPlant: async (plantId) => {
    const now = new Date().toISOString();
    const plants = get().plants.map(p =>
      p.id === plantId ? { ...p, lastWatered: now } : p,
    );
    const record: WateringRecord = { plantId, wateredAt: now };
    const wateringRecords = [...get().wateringRecords, record];
    set({ plants, wateringRecords });
    await savePlants(plants);
    await AsyncStorage.setItem('watering_records', JSON.stringify(wateringRecords));
  },

  getPlantStatus: (plant) => {
    if (!plant.lastWatered) {
      return { label: '未记录浇水', emoji: '❓', needsWater: false };
    }
    const daysSince = Math.floor(
      (Date.now() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince >= plant.wateringIntervalDays) {
      return { label: '需要浇水', emoji: '💧', needsWater: true };
    }
    if (daysSince >= plant.wateringIntervalDays - 1) {
      return { label: '明天浇水', emoji: '🌤', needsWater: false };
    }
    return { label: '状态良好', emoji: '🌿', needsWater: false };
  },
}));
