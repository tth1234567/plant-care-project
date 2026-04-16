from __future__ import annotations

import re
from datetime import date, timedelta
from dataclasses import dataclass
from typing import Any

from langchain_core.documents import Document
from supabase import Client, create_client
from plantagent.config.rag_settings import SUPABASE_URL, SUPABASE_KEY


def _tokenize(text: str) -> set[str]:
    tokens = re.findall(r"[\u4e00-\u9fffA-Za-z0-9_]+", text.lower())
    return {t for t in tokens if len(t) >= 2}


def _to_brief_json(data: dict[str, Any]) -> str:
    important_keys = [
        "id",
        "nickname",
        "species_name",
        "health_level",
        "task_type",
        "scheduled_at",
        "adjusted_at",
        "weather_context",
        "is_resolved",
        "ai_suggestion",
        "note",
        "is_milestone",
        "created_at",
    ]
    pairs = [f"{k}={data.get(k)}" for k in important_keys if k in data]
    return "; ".join(pairs) if pairs else str(data)


@dataclass
class SupabaseContextProvider:
    url: str
    key: str
    user_id: str
    max_per_table: int = 2

    def __post_init__(self) -> None:
        self.client: Client = create_client(self.url, self.key)
        self._docs: list[Document] = []

    @classmethod
    def from_env(cls, user_id: str, max_per_table: int = 2) -> "SupabaseContextProvider":
        url = SUPABASE_URL
        key = SUPABASE_KEY
        if not url or not key:
            raise ValueError("SUPABASE_URL 或 SUPABASE_KEY 未设置，无法启用 Supabase 上下文。")
        return cls(url=url, key=key, user_id=user_id, max_per_table=max_per_table)

    def refresh(self) -> int:
        plants = (
            self.client.table("plants")
            .select("*")
            .eq("user_id", self.user_id)
            .execute()
            .data
            or []
        )
        plant_ids = [p.get("id") for p in plants if p.get("id")]
        diags = []
        logs = []
        if plant_ids:
            diags = (
                self.client.table("diagnoses")
                .select("*")
                .in_("plant_id", plant_ids)
                .execute()
                .data
                or []
            )
            logs = (
                self.client.table("growth_logs")
                .select("*")
                .in_("plant_id", plant_ids)
                .execute()
                .data
                or []
            )
        tasks = (
            self.client.table("tasks")
            .select("*")
            .eq("user_id", self.user_id)
            .execute()
            .data
            or []
        )
        self._docs = (
            self._rows_to_docs(plants, "plants")
            + self._rows_to_docs(diags, "diagnoses")
            + self._rows_to_docs(tasks, "tasks")
            + self._rows_to_docs(logs, "growth_logs")
        )
        return len(self._docs)

    def get_relevant_context(self, query: str, top_n: int = 6) -> str:
        if not self._docs:
            return ""
        q_tokens = _tokenize(query)
        scored: list[tuple[int, Document]] = []
        for d in self._docs:
            doc_tokens = set(d.metadata.get("tokens", []))
            score = len(doc_tokens & q_tokens)
            scored.append((score, d))
        scored.sort(key=lambda x: x[0], reverse=True)
        selected = [d for s, d in scored[:top_n] if s > 0]
        if not selected:
            selected = self._docs[: min(3, len(self._docs))]
        return "\n".join(f"- [{d.metadata.get('table')}] {d.page_content}" for d in selected)

    def get_plant_status_overview_data(self) -> dict[str, Any]:
        plants = (
            self.client.table("plants")
            .select("id,nickname,species_name,health_level")
            .eq("user_id", self.user_id)
            .execute()
            .data
            or []
        )

        if not plants:
            return {
                "overall_status": "暂无植物数据",
                "plants": [],
            }

        health_values = [float(p.get("health_level", 0) or 0) for p in plants]
        avg = sum(health_values) / len(health_values)
        if avg >= 80:
            overall = "整体状态良好"
        elif avg >= 60:
            overall = "整体状态一般，建议重点关注低健康度植物"
        else:
            overall = "整体状态偏弱，建议尽快排查环境与病虫害问题"

        out_plants = []
        for p in plants:
            out_plants.append(
                {
                    "nickname": p.get("nickname") or "未命名植物",
                    "species_name": p.get("species_name") or "未知品种",
                    "health_level": p.get("health_level"),
                }
            )

        out_plants.sort(key=lambda x: float(x.get("health_level", 0) or 0), reverse=True)
        return {
            "overall_status": overall,
            "plants": out_plants,
        }

    def get_recent_tasks_data(
        self,
        scope: str = "today",
        target_date: date | None = None,
    ) -> dict[str, Any]:
        day = target_date or date.today()
        start_day, end_day, scope_label = self._resolve_task_scope(day, scope)

        plants = (
            self.client.table("plants")
            .select("id,nickname,species_name")
            .eq("user_id", self.user_id)
            .execute()
            .data
            or []
        )
        plant_map = {
            p.get("id"): {
                "nickname": p.get("nickname") or "未命名植物",
                "species_name": p.get("species_name") or "未知品种",
            }
            for p in plants
            if p.get("id")
        }

        tasks = (
            self.client.table("tasks")
            .select("id,plant_id,task_type,scheduled_at,adjusted_at,weather_context")
            .eq("user_id", self.user_id)
            .execute()
            .data
            or []
        )

        scoped_tasks: list[dict[str, Any]] = []
        for t in tasks:
            at = t.get("adjusted_at") or t.get("scheduled_at") or ""
            day_text = str(at)[:10]
            if len(day_text) != 10:
                continue
            if not (start_day.isoformat() <= day_text <= end_day.isoformat()):
                continue
            plant_info = plant_map.get(t.get("plant_id"), {"nickname": "未知", "species_name": "未知"})
            scoped_tasks.append(
                {
                    "task_type": t.get("task_type") or "unknown",
                    "scheduled_time": at,
                    "plant_nickname": plant_info["nickname"],
                    "plant_species_name": plant_info["species_name"],
                    "weather_context": t.get("weather_context") or "",
                }
            )

        scoped_tasks.sort(key=lambda x: str(x.get("scheduled_time", "")))
        summary = (
            f"{scope_label}共有 {len(scoped_tasks)} 条养护任务"
            if scoped_tasks
            else f"{scope_label}没有待执行的养护任务"
        )
        return {
            "scope": scope,
            "range_start": start_day.isoformat(),
            "range_end": end_day.isoformat(),
            "summary": summary,
            "tasks": scoped_tasks,
        }

    def get_growth_journal_data(self, limit: int = 8) -> dict[str, Any]:
        plants = (
            self.client.table("plants")
            .select("id,nickname,species_name")
            .eq("user_id", self.user_id)
            .execute()
            .data
            or []
        )
        plant_map = {
            p.get("id"): {
                "nickname": p.get("nickname") or "未命名植物",
                "species_name": p.get("species_name") or "未知品种",
            }
            for p in plants
            if p.get("id")
        }
        plant_ids = [p_id for p_id in plant_map.keys()]
        if not plant_ids:
            return {
                "summary": "还没有植物记录，暂时无法生成成长日记。",
                "entries": [],
            }

        logs = (
            self.client.table("growth_logs")
            .select("id,plant_id,note,is_milestone,created_at")
            .in_("plant_id", plant_ids)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
            or []
        )

        entries: list[dict[str, Any]] = []
        for l in logs:
            p = plant_map.get(l.get("plant_id"), {"nickname": "未知", "species_name": "未知"})
            entries.append(
                {
                    "plant_nickname": p["nickname"],
                    "plant_species_name": p["species_name"],
                    "note": l.get("note") or "",
                    "is_milestone": bool(l.get("is_milestone")),
                    "created_at": l.get("created_at") or "",
                }
            )

        summary = (
            f"已整理最近 {len(entries)} 条成长日志，可生成植物第一视角手账。"
            if entries
            else "目前没有成长日志记录。"
        )
        return {
            "summary": summary,
            "entries": entries,
        }

    @staticmethod
    def _resolve_task_scope(base_day: date, scope: str) -> tuple[date, date, str]:
        if scope == "tomorrow":
            d = base_day + timedelta(days=1)
            return d, d, "明天"
        if scope == "next_3_days":
            end = base_day + timedelta(days=2)
            return base_day, end, "最近3天"
        if scope == "this_week":
            # Monday=0 ... Sunday=6
            start = base_day - timedelta(days=base_day.weekday())
            end = start + timedelta(days=6)
            return start, end, "本周"
        return base_day, base_day, "今天"

    def _rows_to_docs(self, rows: list[dict[str, Any]], table: str) -> list[Document]:
        docs: list[Document] = []
        for row in rows:
            text = _to_brief_json(row)
            docs.append(
                Document(
                    page_content=text,
                    metadata={
                        "source": "supabase",
                        "table": table,
                        "tokens": list(_tokenize(text)),
                    },
                )
            )
        return docs
