import os
import uuid
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import PlantPredictionRequest
from auth import get_current_user
from services.zhipu_service import analyze_plant, predict_health
from services.weather_service import (
    get_weather_by_coords,
    get_weather_by_city,
    format_weather_for_prompt,
    format_weather_json_for_prompt,
)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "E:/cursor_workspace/1/user_photo")

router = APIRouter(prefix="/api/plant", tags=["植物分析"])


@router.post("/analyze")
async def analyze(
    request: Request,
    image: UploadFile = File(...),
    latitude: Optional[str] = Form(None),
    longitude: Optional[str] = Form(None),
    city_name: Optional[str] = Form(None),
    weather_json: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    ext = os.path.splitext(image.filename or "photo.jpg")[1] or ".jpg"
    filename = f"plant_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    with open(filepath, "wb") as f:
        content = await image.read()
        f.write(content)

    weather_context = ""
    parsed_weather = {}

    # Prefer frontend-supplied weather (Open-Meteo, no VPN issues)
    if weather_json:
        weather_context = format_weather_json_for_prompt(weather_json, city_name)
        try:
            import json
            parsed_weather = json.loads(weather_json)
        except Exception:
            pass
    else:
        # Fallback: try QWeather (may fail under VPN)
        try:
            if latitude and longitude:
                wd = await asyncio.to_thread(get_weather_by_coords, latitude, longitude)
                weather_context = format_weather_for_prompt(wd)
                parsed_weather = wd
            elif city_name:
                wd = await asyncio.to_thread(get_weather_by_city, city_name)
                weather_context = format_weather_for_prompt(wd)
                parsed_weather = wd
        except Exception:
            pass

    try:
        result = await asyncio.to_thread(analyze_plant, filepath, weather_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")

    result["id"] = str(uuid.uuid4())
    base_url = str(request.base_url).rstrip("/")
    result["imageUri"] = f"{base_url}/uploads/{filename}"
    result["analyzedAt"] = datetime.utcnow().isoformat()

    # Attach weather info for frontend display
    if weather_json and parsed_weather:
        result["weatherInfo"] = parsed_weather
    elif parsed_weather and not parsed_weather.get("error") and parsed_weather.get("current"):
        result["weatherInfo"] = parsed_weather

    return {"success": True, "data": result}


@router.get("/weather")
async def get_weather(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    city_name: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """返回实时天气 + 7天预报（和风天气数据源）。支持坐标或城市名查询。"""
    try:
        if latitude is not None and longitude is not None:
            data = await asyncio.to_thread(get_weather_by_coords, str(latitude), str(longitude))
        elif city_name:
            data = await asyncio.to_thread(get_weather_by_city, city_name)
        else:
            return {"success": False, "error": "请提供坐标或城市名"}

        if data and not data.get("error") and data.get("current"):
            cur = data["current"]
            forecast = [
                {
                    "date": d.get("date"),
                    "tempMax": str(d.get("tempMax", "")),
                    "tempMin": str(d.get("tempMin", "")),
                    "textDay": d.get("textDay", ""),
                    "textNight": d.get("textNight", ""),
                    "humidity": str(d.get("humidity", "")),
                }
                for d in data.get("forecast", [])
            ]
            return {
                "success": True,
                "data": {
                    "city": data.get("city", ""),
                    "current": {
                        "temp": str(cur.get("temp", "--")),
                        "text": cur.get("text", ""),
                        "humidity": str(cur.get("humidity", "")),
                        "windSpeed": str(cur.get("windScale", cur.get("windSpeed", ""))),
                        "feelsLike": str(cur.get("feelsLike", "")),
                        "windDir": cur.get("windDir", ""),
                    },
                    "forecast": forecast,
                },
            }
        return {"success": False, "error": data.get("error", "天气获取失败")}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/prediction")
async def prediction(
    req: PlantPredictionRequest,
    current_user: User = Depends(get_current_user),
):
    weather_context = ""
    parsed_weather = {}

    # Prefer frontend-supplied weather (Open-Meteo, no VPN issues)
    if req.weather_json:
        weather_context = format_weather_json_for_prompt(req.weather_json, req.city_name)
        try:
            import json
            parsed_weather = json.loads(req.weather_json)
        except Exception:
            pass
    elif req.city_name:
        # Fallback: try QWeather
        try:
            wd = await asyncio.to_thread(get_weather_by_city, req.city_name)
            weather_context = format_weather_for_prompt(wd)
            parsed_weather = wd
        except Exception:
            pass

    try:
        result = await asyncio.to_thread(
            predict_health, req.plantName, req.currentScore, weather_context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预测失败: {str(e)}")

    if weather_json_data := parsed_weather:
        result["weatherInfo"] = weather_json_data

    return {"success": True, "data": result}
