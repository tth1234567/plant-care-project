from __future__ import annotations

from typing import Literal

from langchain_core.tools import StructuredTool

from plantagent.rag.supabase_context import SupabaseContextProvider


def build_get_plant_status_tool(provider: SupabaseContextProvider) -> StructuredTool:
    def _get_plant_status_overview() -> dict:
        return provider.get_plant_status_overview_data()

    return StructuredTool.from_function(
        name="get_plant_status_overview",
        description="获取当前用户每一盆植物的健康状态总览，返回总体状态和逐盆健康度。",
        func=_get_plant_status_overview,
    )


def build_get_recent_tasks_tool(provider: SupabaseContextProvider) -> StructuredTool:
    def _get_recent_tasks(
        scope: Literal["today", "tomorrow", "next_3_days", "this_week"] = "today",
    ) -> dict:
        return provider.get_recent_tasks_data(scope=scope)

    return StructuredTool.from_function(
        name="get_recent_tasks",
        description=(
            "获取当前用户在指定时间范围内的养护任务。"
            "scope 可选: today, tomorrow, next_3_days, this_week。"
        ),
        func=_get_recent_tasks,
    )


def build_get_growth_journal_tool(provider: SupabaseContextProvider) -> StructuredTool:
    def _get_growth_journal(limit: int = 8) -> dict:
        return provider.get_growth_journal_data(limit=limit)

    return StructuredTool.from_function(
        name="get_growth_journal",
        description="回顾成长日志，返回可用于生成植物第一视角手账的日志条目。",
        func=_get_growth_journal,
    )

