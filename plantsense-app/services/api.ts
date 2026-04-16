import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getSecureItem } from './secureStorage';
import { API_URL, STORAGE_KEYS } from '../constants';
import type {
  ApiResponse,
  AnalysisResult,
  PredictionResult,
  LoginRequest,
  RegisterRequest,
  User,
  ChatMessage,
} from '../types';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const DEFAULT_TIMEOUT = 30_000;
const UPLOAD_TIMEOUT = 120_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  if (Platform.OS === 'web') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Object.assign(new Error('请求超时'), { name: 'AbortError' })),
      timeoutMs,
    );
    fetch(url, options).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_URL}${endpoint}`,
      { ...options, headers: { ...headers, ...(options.headers as Record<string, string>) } },
      DEFAULT_TIMEOUT,
    );
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.detail || json.message || json.error || `请求失败 (${response.status})` };
    }
    return json as ApiResponse<T>;
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: '请求超时，请稍后重试' };
    return { success: false, error: error.message || '网络连接失败' };
  }
}

async function uploadImage<T>(
  endpoint: string,
  imageUri: string,
  extraFields?: Record<string, string>,
): Promise<ApiResponse<T>> {
  try {
    const token = await getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
    const url = `${API_URL}${endpoint}`;

    if (Platform.OS !== 'web') {
      let localUri = imageUri;
      if (imageUri.includes('%40') || imageUri.includes('%2F')) {
        localUri = decodeURIComponent(imageUri);
      }
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        return { success: false, error: '图片文件不存在，请重新选择' };
      }
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const uploadResult = await FileSystem.uploadAsync(url, localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'image',
        mimeType: 'image/jpeg',
        parameters: extraFields || {},
        headers,
      });
      const json = JSON.parse(uploadResult.body);
      if (uploadResult.status >= 200 && uploadResult.status < 300) return json as ApiResponse<T>;
      return { success: false, error: json.detail || json.message || `上传失败 (${uploadResult.status})` };
    }

    const formData = new FormData();
    const resp = await fetch(imageUri);
    const blob = await resp.blob();
    formData.append('image', blob, 'plant.jpg');
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) formData.append(key, value);
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetchWithTimeout(url, { method: 'POST', body: formData, headers }, UPLOAD_TIMEOUT);
    const json = await response.json();
    if (!response.ok) return { success: false, error: json.detail || json.message || `上传失败 (${response.status})` };
    return json as ApiResponse<T>;
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: '分析超时，请稍后重试' };
    return { success: false, error: error.message || '网络连接失败' };
  }
}

export const api = {
  login(req: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(req) });
  },

  register(req: RegisterRequest): Promise<ApiResponse<{ user: User }>> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(req) });
  },

  analyzePlant(
    imageUri: string,
    options?: { latitude?: string; longitude?: string; cityName?: string; weatherJson?: string },
  ): Promise<ApiResponse<AnalysisResult>> {
    const extra: Record<string, string> = {};
    if (options?.latitude) extra.latitude = options.latitude;
    if (options?.longitude) extra.longitude = options.longitude;
    if (options?.cityName) extra.city_name = options.cityName;
    if (options?.weatherJson) extra.weather_json = options.weatherJson;
    return uploadImage('/plant/analyze', imageUri, Object.keys(extra).length ? extra : undefined);
  },

  getPrediction(
    plantName: string,
    currentScore: number,
    cityName?: string,
    weatherJson?: string,
  ): Promise<ApiResponse<PredictionResult>> {
    return request('/plant/prediction', {
      method: 'POST',
      body: JSON.stringify({ plantName, currentScore, city_name: cityName, weather_json: weatherJson }),
    });
  },

  getUserProfile(): Promise<ApiResponse<User>> {
    return request('/user/profile');
  },

  updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return request('/user/profile', { method: 'PUT', body: JSON.stringify(data) });
  },

  chat(messages: ChatMessage[]): Promise<ApiResponse<{ reply: string }>> {
    return request('/chat', { method: 'POST', body: JSON.stringify({ messages }) });
  },
};
