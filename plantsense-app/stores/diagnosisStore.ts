import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import type { DiagnosisRecord, PredictionResult } from '../types';

interface DiagnosisStore {
  records: DiagnosisRecord[];
  loaded: boolean;
  loadRecords: () => Promise<void>;
  addRecord: (record: DiagnosisRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  updatePrediction: (id: string, result: PredictionResult) => Promise<void>;
}

export const useDiagnosisStore = create<DiagnosisStore>((set, get) => ({
  records: [],
  loaded: false,

  loadRecords: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DIAGNOSIS_HISTORY);
      const records: DiagnosisRecord[] = raw ? JSON.parse(raw) : [];
      set({ records, loaded: true });
    } catch {
      set({ records: [], loaded: true });
    }
  },

  addRecord: async (record) => {
    const records = [record, ...get().records].slice(0, 50);
    set({ records });
    await AsyncStorage.setItem(STORAGE_KEYS.DIAGNOSIS_HISTORY, JSON.stringify(records));
  },

  removeRecord: async (id) => {
    const records = get().records.filter(r => r.id !== id);
    set({ records });
    await AsyncStorage.setItem(STORAGE_KEYS.DIAGNOSIS_HISTORY, JSON.stringify(records));
  },

  clearAll: async () => {
    set({ records: [] });
    await AsyncStorage.removeItem(STORAGE_KEYS.DIAGNOSIS_HISTORY);
  },

  updatePrediction: async (id, result) => {
    const records = get().records.map(r =>
      r.id === id
        ? { ...r, predictionResult: result, predictionSavedAt: new Date().toISOString() }
        : r
    );
    set({ records });
    await AsyncStorage.setItem(STORAGE_KEYS.DIAGNOSIS_HISTORY, JSON.stringify(records));
  },
}));
