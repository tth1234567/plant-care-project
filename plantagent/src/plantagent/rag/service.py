from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, List, Literal, Optional, Sequence, TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.chat_models import ChatTongyi
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

from plantagent.config.rag_settings import (
    CHROMA_DIR,
    EMBEDDING_MODEL_NAME,
    KNOWLEDGE_PATH,
    LLM_MODEL_NAME,
    RERANK_MODEL_NAME,
    RERANK_TOP_N,
    RETRIEVAL_CANDIDATE_K,
    SUPABASE_DEFAULT_USER_ID,
)
from plantagent.rag.supabase_context import SupabaseContextProvider
from plantagent.tools.supabase_tools import (
    build_get_growth_journal_tool,
    build_get_plant_status_tool,
    build_get_recent_tasks_tool,
)


class ChatMsg(TypedDict):
    role: Literal["user", "assistant"]
    content: str


def _is_db_intent(question: str) -> bool:
    patterns = [
        r"我的植物状态",
        r"植物状态",
        r"健康度",
        r"我有哪些植物",
        r"每一盆",
        r"我的植物",
    ]
    return any(re.search(p, question) for p in patterns)


def _is_tasks_intent(question: str) -> bool:
    patterns = [
        r"今天.*任务",
        r"明天.*任务",
        r"最近3天",
        r"三天内",
        r"本周.*任务",
        r"今天.*养护",
        r"今天要做什么",
        r"待办",
        r"最近任务",
        r"任务安排",
    ]
    return any(re.search(p, question) for p in patterns)


def _detect_task_scope(question: str) -> str:
    if re.search(r"明天", question):
        return "tomorrow"
    if re.search(r"最近3天|三天内", question):
        return "next_3_days"
    if re.search(r"本周", question):
        return "this_week"
    return "today"


def _is_growth_journal_intent(question: str) -> bool:
    patterns = [
        r"成长日记",
        r"成长日志",
        r"回顾.*日志",
        r"手账",
        r"第一视角",
        r"和主人对话",
    ]
    return any(re.search(p, question) for p in patterns)


def _format_history(messages: Sequence[ChatMsg], max_turns: int = 6) -> str:
    items = []
    for m in messages[-max_turns:]:
        role = "用户" if m["role"] == "user" else "助手"
        content = (m.get("content") or "").strip()
        if not content:
            continue
        items.append(f"{role}：{content}")
    return "\n".join(items)


@dataclass(frozen=True)
class _RagPipeline:
    compression_retriever: ContextualCompressionRetriever
    prompt: ChatPromptTemplate
    llm: ChatTongyi


@lru_cache(maxsize=1)
def _get_pipeline(
    persist_dir: str = str(CHROMA_DIR),
    embedding_model_name: str = EMBEDDING_MODEL_NAME,
    rerank_model_name: str = RERANK_MODEL_NAME,
    llm_model_name: str = LLM_MODEL_NAME,
    candidate_k: int = RETRIEVAL_CANDIDATE_K,
    rerank_top_n: int = RERANK_TOP_N,
    temperature: float = 0.2,
) -> _RagPipeline:
    persist_path = Path(persist_dir)
    if not persist_path.exists():
        raise FileNotFoundError(
            f"Chroma index not found: {persist_path}\n"
            f"请先运行 `plantagent/scripts/build_index.py` 生成索引。"
        )

    embeddings = HuggingFaceEmbeddings(model_name=embedding_model_name)
    vectorstore = Chroma(
        persist_directory=str(persist_path),
        embedding_function=embeddings,
    )
    base_retriever = vectorstore.as_retriever(search_kwargs={"k": candidate_k})

    cross_encoder = HuggingFaceCrossEncoder(model_name=rerank_model_name)
    reranker = CrossEncoderReranker(model=cross_encoder, top_n=rerank_top_n)
    compression_retriever = ContextualCompressionRetriever(
        base_retriever=base_retriever,
        base_compressor=reranker,
    )

    llm = ChatTongyi(model=llm_model_name, temperature=temperature)
    system_prompt = (
        "你是植物护理助手。\n"
        "只能基于检索到的知识片段回答，不要编造。\n"
        "对于用药/毒性/安全相关问题，请给出更谨慎的提示，并建议采取通用安全措施。"
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            (
                "human",
                "对话历史（可能为空）：\n{history}\n\n"
                "用户问题：{input}\n\n"
                "知识片段（由检索与重排给出）：\n"
                "{context}\n\n"
                "Tool 返回的结构化数据库结果（若为空则忽略）：\n"
                "{tool_result}\n\n"
                "Supabase 用户上下文（若为空则忽略）：\n"
                "{user_context}\n\n"
                "如果 tool_result 存在且与用户问题相关，先给出 1 句总体结论，再逐条列出每一盆植物（昵称、品种、健康度）。\n"
                "如果 tool_result 包含任务信息，请按“该时间范围任务总数 + 分条任务（植物、任务类型、时间、天气备注）”输出。\n"
                "如果 tool_result 包含成长日志信息，请使用植物第一视角写成精美手账风格，像植物在和主人对话，语气温暖，分段清晰。\n"
                "请直接给出答案（尽量可执行、分点少量即可）。如果片段不足以确认，请说明我无法从现有资料确认，并建议更安全的做法。",
            ),
        ]
    )
    return _RagPipeline(compression_retriever=compression_retriever, prompt=prompt, llm=llm)


def answer(
    messages: Sequence[ChatMsg],
    *,
    enable_supabase: bool = False,
    supabase_user_id: str = SUPABASE_DEFAULT_USER_ID,
    persist_dir: Path = CHROMA_DIR,
    embedding_model_name: str = EMBEDDING_MODEL_NAME,
    rerank_model_name: str = RERANK_MODEL_NAME,
    llm_model_name: str = LLM_MODEL_NAME,
    candidate_k: int = RETRIEVAL_CANDIDATE_K,
    rerank_top_n: int = RERANK_TOP_N,
    temperature: float = 0.2,
) -> str:
    user_msgs = [m for m in messages if m.get("role") in ("user", "assistant")]
    last_user = next((m for m in reversed(user_msgs) if m["role"] == "user"), None)
    if not last_user:
        return "请先告诉我你的问题，我才能帮你判断如何养护。"

    q = (last_user.get("content") or "").strip()
    if not q:
        return "请把问题描述得更具体一点（例如植物品种、现象、环境），我才能给出建议。"

    pipeline = _get_pipeline(
        persist_dir=str(persist_dir),
        embedding_model_name=embedding_model_name,
        rerank_model_name=rerank_model_name,
        llm_model_name=llm_model_name,
        candidate_k=candidate_k,
        rerank_top_n=rerank_top_n,
        temperature=temperature,
    )

    docs = pipeline.compression_retriever.invoke(q)
    context = "\n\n---\n\n".join(d.page_content for d in docs) if docs else ""

    history = _format_history(user_msgs[:-1])

    user_context = ""
    tool_result = ""
    if enable_supabase:
        if not supabase_user_id:
            raise ValueError("启用 Supabase 时必须提供 user_id（参数或 SUPABASE_USER_ID 环境变量）。")
        supabase_provider = SupabaseContextProvider.from_env(user_id=supabase_user_id)
        supabase_provider.refresh()
        user_context = supabase_provider.get_relevant_context(q)

        tool_payload: dict[str, object] = {}
        plant_status_tool = build_get_plant_status_tool(supabase_provider)
        recent_tasks_tool = build_get_recent_tasks_tool(supabase_provider)
        growth_journal_tool = build_get_growth_journal_tool(supabase_provider)

        if _is_db_intent(q):
            tool_payload["plant_status"] = plant_status_tool.invoke({})
        if _is_tasks_intent(q):
            tool_payload["recent_tasks"] = recent_tasks_tool.invoke({"scope": _detect_task_scope(q)})
        if _is_growth_journal_intent(q):
            tool_payload["growth_journal"] = growth_journal_tool.invoke({"limit": 10})
        if tool_payload:
            tool_result = json.dumps(tool_payload, ensure_ascii=False)

    lc_messages = pipeline.prompt.format_messages(
        input=q,
        history=history,
        context=context,
        user_context=user_context,
        tool_result=tool_result,
    )
    resp = pipeline.llm.invoke(lc_messages)
    return (resp.content or "").strip() or "抱歉，我暂时无法回答这个问题。"

