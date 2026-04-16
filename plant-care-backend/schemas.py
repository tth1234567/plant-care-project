from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    nickname: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    nickname: Optional[str] = None
    avatar: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserResponse
    token: str


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None


class PlantPredictionRequest(BaseModel):
    plantName: str
    currentScore: int
    city_name: Optional[str] = None
    weather_json: Optional[str] = None


class CareAdvice(BaseModel):
    category: str
    title: str
    description: str
    priority: str


class AnalysisResult(BaseModel):
    id: str
    plantName: str
    scientificName: Optional[str] = None
    healthStatus: str
    healthScore: int
    issues: list[str]
    advice: list[CareAdvice]
    imageUri: str
    analyzedAt: str


class PredictionDay(BaseModel):
    day: int
    date: str
    healthScore: int
    healthStatus: str
    description: str
    actions: list[str]


class PredictionResult(BaseModel):
    plantName: str
    currentHealthScore: int
    predictions: list[PredictionDay]
    summary: str


class CareGuide(BaseModel):
    water: str
    light: str
    temperature: str
    soil: str
    fertilizer: str


class EncyclopediaEntry(BaseModel):
    name: str
    scientificName: str
    family: str
    origin: str
    description: str
    careGuide: CareGuide
    commonIssues: list[str]


class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None
