import { create } from 'zustand';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem } from '../services/secureStorage';
import { API_URL, STORAGE_KEYS } from '../constants';
import type { WeatherInfo, WeatherForecastDay } from '../types';

const CITY_STORAGE_KEY = 'selected_city';

// WMO Weather interpretation codes → Chinese text
const WMO_TEXT: Record<number, string> = {
  0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
  45: '雾', 48: '冻雾',
  51: '毛毛雨', 53: '中毛毛雨', 55: '浓毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '冰粒',
  80: '阵雨', 81: '中阵雨', 82: '强阵雨',
  85: '阵雪', 86: '强阵雪',
  95: '雷阵雨', 96: '雷阵雨夹冰雹', 99: '强雷阵雨夹冰雹',
};

function wmoText(code: number): string {
  return WMO_TEXT[code] ?? '未知';
}

export interface CityOption {
  name: string;
  lat: number;
  lon: number;
}

export const PRESET_CITIES: CityOption[] = [
  { name: '北京', lat: 39.90, lon: 116.41 },
  { name: '天津', lat: 39.12, lon: 117.19 },
  { name: '上海', lat: 31.23, lon: 121.47 },
  { name: '广州', lat: 23.13, lon: 113.26 },
  { name: '成都', lat: 30.57, lon: 104.07 },
  { name: '南京', lat: 32.06, lon: 118.78 },
  { name: '武汉', lat: 30.59, lon: 114.31 },
  { name: '西安', lat: 34.34, lon: 108.94 },
  { name: '杭州', lat: 30.25, lon: 120.15 },
  { name: '深圳', lat: 22.54, lon: 114.06 },
];

const DEFAULT_CITY: CityOption = PRESET_CITIES[1]; // 天津

interface WeatherStore {
  weather: WeatherInfo | null;
  cityName: string;
  currentCity: CityOption;
  loaded: boolean;
  fetchWeather: () => Promise<void>;
  refetch: () => Promise<void>;
  setCity: (city: CityOption) => Promise<void>;
  loadSavedCity: () => Promise<void>;
}

/** 通过后端调用和风天气（中国气象局数据源），精度优于 Open-Meteo */
export async function fetchQWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  try {
    const token = await getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let resp: Response;
    try {
      resp = await fetch(
        `${API_URL}/plant/weather?latitude=${lat}&longitude=${lon}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json.success || !json.data?.current) return null;

    const cur = json.data.current;
    const forecast: WeatherForecastDay[] = (json.data.forecast ?? []).map((d: any) => ({
      date: d.date,
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      textDay: d.textDay,
    }));

    return {
      temp: cur.temp,
      text: cur.text,
      humidity: cur.humidity,
      windSpeed: cur.windSpeed,
      forecast,
    };
  } catch {
    return null;
  }
}

export async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherInfo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=8&timeformat=iso8601`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let resp: Response;
  try {
    resp = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) return null;
  const data = await resp.json();

  const cur = data.current;
  const daily = data.daily;

  if (!cur) return null;

  // 过滤掉早于本地今天的条目，防止 UTC 与本地时区偏移导致日期错位
  const todayStr = new Date().toLocaleDateString('sv-SE'); // "YYYY-MM-DD" 本地时区
  const allTimes: string[] = daily?.time ?? [];
  const startIdx = allTimes.findIndex((d: string) => d >= todayStr);
  // startIdx === -1 表示所有日期均早于今天，返回空数组避免显示过去日期
  const times = startIdx >= 0 ? allTimes.slice(startIdx) : [];

  const forecast: WeatherForecastDay[] = times.slice(0, 7).map((date: string, i: number) => {
    const realIdx = startIdx >= 0 ? startIdx + i : i;
    const tempMax = daily.temperature_2m_max?.[realIdx];
    const tempMin = daily.temperature_2m_min?.[realIdx];
    const code = daily.weather_code?.[realIdx];
    return {
      date,
      tempMax: tempMax != null ? String(Math.round(tempMax)) : '--',
      tempMin: tempMin != null ? String(Math.round(tempMin)) : '--',
      textDay: code != null ? wmoText(code) : '未知',
    };
  });

  return {
    temp: String(Math.round(cur.temperature_2m)),
    text: wmoText(cur.weather_code),
    humidity: String(cur.relative_humidity_2m),
    windSpeed: String(cur.wind_speed_10m),
    forecast,
  };
}

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  weather: null,
  cityName: DEFAULT_CITY.name,
  currentCity: DEFAULT_CITY,
  loaded: false,

  loadSavedCity: async () => {
    try {
      const raw = await AsyncStorage.getItem(CITY_STORAGE_KEY);
      if (raw) {
        const city: CityOption = JSON.parse(raw);
        set({ currentCity: city, cityName: city.name });
      }
    } catch {
      // keep default
    }
  },

  fetchWeather: async () => {
    if (get().loaded) return;
    await get().refetch();
  },

  refetch: async () => {
    set({ loaded: false });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const [geo] = await Location.reverseGeocodeAsync(loc.coords);
        const detectedCity = geo?.city || geo?.region || get().currentCity.name;
        // 优先用和风天气（更精准），失败则降级到 Open-Meteo
        const weather =
          (await fetchQWeather(loc.coords.latitude, loc.coords.longitude)) ??
          (await fetchOpenMeteo(loc.coords.latitude, loc.coords.longitude));
        if (weather) {
          set({ weather, cityName: detectedCity, loaded: true });
          return;
        }
      }
    } catch {
      // GPS not available (e.g. Huawei without Google Services) — fall through to city fallback
    }

    // Fallback: use the saved/default city
    try {
      const { currentCity } = get();
      const weather =
        (await fetchQWeather(currentCity.lat, currentCity.lon)) ??
        (await fetchOpenMeteo(currentCity.lat, currentCity.lon));
      set({ weather, cityName: currentCity.name, loaded: true });
    } catch (e) {
      console.log('[weather] city fallback error:', e);
      set({ loaded: true });
    }
  },

  setCity: async (city: CityOption) => {
    set({ currentCity: city, cityName: city.name, loaded: false });
    try {
      await AsyncStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
    } catch { /* ignore */ }
    // Re-fetch weather for the new city，优先和风天气，失败降级 Open-Meteo
    try {
      const weather =
        (await fetchQWeather(city.lat, city.lon)) ??
        (await fetchOpenMeteo(city.lat, city.lon));
      set({ weather, cityName: city.name, loaded: true });
    } catch {
      set({ weather: null, loaded: true });
    }
  },
}));
