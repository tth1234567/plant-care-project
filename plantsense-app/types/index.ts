export interface User {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WeatherForecastDay {
  date: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
}

export interface WeatherInfo {
  temp: string;
  text: string;
  humidity?: string;
  windSpeed?: string;
  forecast?: WeatherForecastDay[];
}

export type PlantPersonality = 'lively' | 'cool' | 'elegant';

export interface GardenPlant {
  id: string;
  nickname: string;
  species: string;
  emoji: string;
  coverImage?: string;
  addedAt: string;
  lastWatered: string | null;
  wateringIntervalDays: number;
  reminderEnabled: boolean;
  personality: PlantPersonality;
  notes?: string;
}

export interface PlantReminder {
  id: string;
  plantId: string;
  plantNickname: string;
  title: string;
  datetime: string;
  notificationId?: string;
}

export interface WateringRecord {
  plantId: string;
  wateredAt: string;
}

export interface DiagnosisRecord {
  id: string;
  imageUri: string;
  plantName: string;
  healthScore: number;
  status: string;
  summary: string;
  createdAt: string;
  analysisResult: AnalysisResult;
  predictionResult?: PredictionResult;
  predictionSavedAt?: string;
}

export interface AnalysisResult {
  plantName: string;
  healthScore: number;
  status: string;
  summary: string;
  careAdvice: CareAdvice[];
  climateAdvice?: string;
  weatherInfo?: WeatherInfo;
}

export interface CareAdvice {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PredictionDay {
  date: string;
  score: number;
  status: string;
  advice: string;
}

export interface PredictionResult {
  predictions: PredictionDay[];
  overallTrend: string;
  weatherInfo?: WeatherInfo;
}

export interface PlantEntry {
  id: string;
  name: string;
  family: string;
  emoji: string;
  description: string;
  watering: string;
  light: string;
  temperature: string;
  humidity: string;
  tips: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
