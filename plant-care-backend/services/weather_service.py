import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

QWEATHER_API_KEY = os.getenv("QWEATHER_API_KEY", "")
BASE_URL = "https://kv4t2c3jv6.re.qweatherapi.com/v7"
GEO_URL = "https://kv4t2c3jv6.re.qweatherapi.com/v2"

# 若天气 API 返回 403 Invalid Host，请到 https://dev.qweather.com/ 控制台
# 将 API Key 的「API 绑定」改为「无」或添加服务器 IP 到白名单


def get_weather_by_coords(latitude: str, longitude: str) -> dict:
    location = f"{longitude},{latitude}"
    return _fetch_weather(location)


def get_weather_by_city(city_name: str) -> dict:
    """Look up city coordinates, then fetch weather."""
    try:
        resp = requests.get(
            f"{GEO_URL}/city/lookup",
            params={"location": city_name, "key": QWEATHER_API_KEY, "number": 1},
            timeout=10,
        )
        data = resp.json()
        if data.get("code") != "200" or not data.get("location"):
            return {"error": f"城市查询失败: {city_name}"}
        loc = data["location"][0]
        location = f"{loc['lon']},{loc['lat']}"
        result = _fetch_weather(location)
        result["city"] = loc.get("name", city_name)
        return result
    except Exception as e:
        return {"error": f"城市查询异常: {str(e)}"}


def _fetch_weather(location: str) -> dict:
    result = {"city": "", "current": {}, "forecast": []}

    try:
        now_resp = requests.get(
            f"{BASE_URL}/weather/now",
            params={"location": location, "key": QWEATHER_API_KEY, "lang": "zh"},
            timeout=10,
        )
        now_data = now_resp.json()
        if now_data.get("code") == "200" and now_data.get("now"):
            n = now_data["now"]
            result["current"] = {
                "temp": n.get("temp"),
                "text": n.get("text"),
                "humidity": n.get("humidity"),
                "windDir": n.get("windDir"),
                "windScale": n.get("windScale"),
                "feelsLike": n.get("feelsLike"),
            }
        elif now_resp.status_code == 403 or now_data.get("error"):
            logger.warning("和风天气 API 调用失败: %s", now_data.get("error", {}).get("detail", now_resp.text[:200]))
    except Exception as e:
        logger.warning("和风天气请求异常: %s", str(e))

    try:
        forecast_resp = requests.get(
            f"{BASE_URL}/weather/7d",
            params={"location": location, "key": QWEATHER_API_KEY, "lang": "zh"},
            timeout=10,
        )
        forecast_data = forecast_resp.json()
        if forecast_data.get("code") == "200" and forecast_data.get("daily"):
            result["forecast"] = [
                {
                    "date": d.get("fxDate"),
                    "tempMax": d.get("tempMax"),
                    "tempMin": d.get("tempMin"),
                    "textDay": d.get("textDay"),
                    "textNight": d.get("textNight"),
                    "humidity": d.get("humidity"),
                }
                for d in forecast_data["daily"]
            ]
        elif forecast_resp.status_code == 403 or forecast_data.get("error"):
            logger.warning("和风天气 7 日预报 API 失败: %s", forecast_data.get("error", {}).get("detail", forecast_resp.text[:200]))
    except Exception as e:
        logger.warning("和风天气 7 日预报请求异常: %s", str(e))

    return result


def format_weather_json_for_prompt(weather_json_str: str, city_name: str | None = None) -> str:
    """Parse the Open-Meteo JSON sent from the frontend and format it for the AI prompt."""
    import json
    try:
        w = json.loads(weather_json_str)
    except Exception:
        return ""

    lines = []
    city = city_name or "未知"
    temp = w.get("temp", "?")
    text = w.get("text", "未知")
    humidity = w.get("humidity", "?")
    wind_speed = w.get("windSpeed", "?")

    lines.append(
        f"用户所在城市：{city}，当前天气：{text}，"
        f"气温{temp}°C，湿度{humidity}%，风速{wind_speed}km/h"
    )

    forecast = w.get("forecast", [])
    if forecast:
        fc_parts = []
        for d in forecast[:7]:
            fc_parts.append(
                f"{d.get('date', '?')}：{d.get('textDay', '?')}，"
                f"{d.get('tempMin', '?')}~{d.get('tempMax', '?')}°C"
            )
        lines.append("未来7天天气预报：" + "；".join(fc_parts))

    return "\n".join(lines)


def format_weather_for_prompt(weather: dict) -> str:
    if not weather or weather.get("error") or not weather.get("current"):
        return ""

    lines = []
    city = weather.get("city", "未知")
    cur = weather["current"]
    lines.append(
        f"用户所在城市：{city}，当前天气：{cur.get('text', '未知')}，"
        f"气温{cur.get('temp', '?')}°C（体感{cur.get('feelsLike', '?')}°C），"
        f"湿度{cur.get('humidity', '?')}%，{cur.get('windDir', '')}风{cur.get('windScale', '')}级"
    )

    forecast = weather.get("forecast", [])
    if forecast:
        fc_parts = []
        for d in forecast[:7]:
            fc_parts.append(
                f"{d['date']}：{d['textDay']}/{d['textNight']}，"
                f"{d['tempMin']}~{d['tempMax']}°C"
            )
        lines.append("未来7天天气预报：" + "；".join(fc_parts))

    return "\n".join(lines)
