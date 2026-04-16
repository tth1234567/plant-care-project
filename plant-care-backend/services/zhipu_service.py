import os
import json
import time
import base64
import logging
from datetime import date
from dotenv import load_dotenv
from zhipuai import ZhipuAI

load_dotenv()

logger = logging.getLogger(__name__)

ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY", "")
VISION_MODEL = os.getenv("ZHIPU_VISION_MODEL", "glm-4v-flash")
TEXT_MODEL = os.getenv("ZHIPU_TEXT_MODEL", "glm-4-flash")

client = ZhipuAI(api_key=ZHIPU_API_KEY)

ANALYSIS_PROMPT_BASE = """你是一个专业的植物健康分析专家。请分析这张植物照片，返回严格的 JSON 格式结果。

要求：
1. 识别植物名称和学名
2. 评估健康状态（healthy/warning/danger）
3. 给出 0-100 的健康评分
4. 列出发现的问题
5. 给出养护建议
{weather_instruction}
必须返回以下 JSON 格式（不要包含 markdown 代码块标记，直接返回 JSON）：
{{
  "plantName": "植物中文名",
  "scientificName": "学名",
  "healthStatus": "healthy 或 warning 或 danger",
  "healthScore": 85,
  "issues": ["问题1", "问题2"],
  "advice": [
    {{
      "category": "water 或 light 或 fertilizer 或 temperature 或 pest 或 general",
      "title": "建议标题",
      "description": "具体描述",
      "priority": "high 或 medium 或 low"
    }}
  ],
  "climateAdvice": "结合当地气候的综合养护建议（如果有天气信息）或空字符串"
}}"""

WEATHER_INSTRUCTION = """6. 结合用户所在地的天气信息，给出针对当地气候的养护建议
7. 在 advice 中至少包含一条与当地气候相关的建议

用户所在地天气信息：
{weather_context}
"""

PREDICTION_PROMPT_BASE = """你是一个植物健康预测专家。根据以下植物信息，预测未来7天的健康趋势。

植物名称：{plant_name}
当前健康评分：{current_score}/100
今天的日期：{today}
{weather_section}
必须返回以下 JSON 格式（不要包含 markdown 代码块标记，直接返回 JSON）：
{{
  "plantName": "{plant_name}",
  "currentHealthScore": {current_score},
  "summary": "整体趋势总结（2-3句话）",
  "predictions": [
    {{
      "day": 1,
      "date": "{today}",
      "healthScore": 分数,
      "healthStatus": "healthy 或 warning 或 danger",
      "description": "当天状态描述（如有天气信息，请结合当天天气对植物健康的影响）",
      "actions": ["建议操作1", "建议操作2"]
    }}
  ]
}}

请生成完整的7天预测数据，第1天日期为今天 {today}，之后每天依次加1天。"""

PREDICTION_WEATHER_SECTION = """
用户所在地天气信息：
{weather_context}
请在每天的 description 和 actions 中结合当天天气对植物的影响给出具体说明。
"""

ENCYCLOPEDIA_PROMPT = """你是一个植物学百科专家。请为以下植物生成详细的百科介绍。

植物名称：{plant_name}

必须返回以下 JSON 格式（不要包含 markdown 代码块标记，直接返回 JSON）：
{{
  "name": "中文名",
  "scientificName": "学名",
  "family": "科属",
  "origin": "原产地",
  "description": "详细描述（100-200字）",
  "careGuide": {{
    "water": "浇水建议",
    "light": "光照建议",
    "temperature": "温度建议",
    "soil": "土壤建议",
    "fertilizer": "施肥建议"
  }},
  "commonIssues": ["常见问题1", "常见问题2", "常见问题3"]
}}"""


def image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def parse_json_response(text: str) -> dict:
    """从 LLM 响应中提取 JSON，兼容 markdown 代码块包裹的情况"""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = lines[1:]  # remove ```json
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    return json.loads(cleaned)


MAX_RETRIES = 3
RETRY_DELAYS = [3, 6, 12]


def _call_with_retry(create_fn, description: str = "API") -> str:
    """带重试的 API 调用，遇到 429 限频自动等待重试"""
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"{description} 第 {attempt + 1} 次调用...")
            response = create_fn()
            content = response.choices[0].message.content
            logger.info(f"{description} 调用成功, 响应长度: {len(content) if content else 0}")
            return content
        except Exception as e:
            error_str = str(e)
            logger.warning(f"{description} 第 {attempt + 1} 次调用失败: {error_str[:200]}")
            if "429" in error_str or "1302" in error_str:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAYS[attempt])
                    continue
                raise Exception(f"请求过于频繁，请等待几秒后再试")
            raise
    raise Exception(f"{description}调用失败")


def analyze_plant(image_path: str, weather_context: str = "") -> dict:
    b64 = image_to_base64(image_path)

    if weather_context:
        weather_inst = WEATHER_INSTRUCTION.format(weather_context=weather_context)
    else:
        weather_inst = ""
    prompt = ANALYSIS_PROMPT_BASE.format(weather_instruction=weather_inst)

    image_content = {
        "type": "image_url",
        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
    }

    def create():
        return client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        image_content,
                    ],
                }
            ],
            temperature=0.3,
            timeout=90,
        )

    logger.info(f"开始植物分析, 模型: {VISION_MODEL}, 图片: {image_path}")
    return parse_json_response(_call_with_retry(create, "植物分析"))


def predict_health(plant_name: str, current_score: int, weather_context: str = "") -> dict:
    today = date.today().isoformat()
    weather_section = (
        PREDICTION_WEATHER_SECTION.format(weather_context=weather_context)
        if weather_context
        else ""
    )
    prompt = PREDICTION_PROMPT_BASE.format(
        plant_name=plant_name,
        current_score=current_score,
        today=today,
        weather_section=weather_section,
    )

    def create():
        return client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            timeout=60,
        )

    return parse_json_response(_call_with_retry(create, "健康预测"))


def generate_encyclopedia(plant_name: str) -> dict:
    prompt = ENCYCLOPEDIA_PROMPT.format(plant_name=plant_name)

    def create():
        return client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            timeout=60,
        )

    return parse_json_response(_call_with_retry(create, "百科生成"))
