from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

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

def _doc_brief(doc) -> str:
    h2 = doc.metadata.get("h2")
    h3 = doc.metadata.get("h3")
    h4 = doc.metadata.get("h4")
    parts = [p for p in [h2, h3, h4] if p]
    return " / ".join(parts) if parts else "unknown-section"


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


def run_chat(
    persist_dir: Path = CHROMA_DIR,
    knowledge_path: Path = KNOWLEDGE_PATH,
    embedding_model_name: str = EMBEDDING_MODEL_NAME,
    rerank_model_name: str = RERANK_MODEL_NAME,
    llm_model_name: str = LLM_MODEL_NAME,
    candidate_k: int = RETRIEVAL_CANDIDATE_K,
    rerank_top_n: int = RERANK_TOP_N,
    temperature: float = 0.2,
    enable_supabase: bool = False,
    supabase_user_id: str = SUPABASE_DEFAULT_USER_ID,
) -> None:
    """ RAG：分片索引(离线已完成) -> 召回 -> 重排 -> 生成。"""

    if not persist_dir.exists():
        raise FileNotFoundError(
            f"Chroma index not found: {persist_dir}\n"
            f"请先运行 `scripts/build_index.py` 生成索引。"
        )

    # Stage 1：向量召回
    embeddings = HuggingFaceEmbeddings(model_name=embedding_model_name)
    vectorstore = Chroma(
        persist_directory=str(persist_dir),
        embedding_function=embeddings,
    )
    base_retriever = vectorstore.as_retriever(search_kwargs={"k": candidate_k})

    # Stage 2：交叉编码器重排（精排）
    print(f"正在加载重排模型: {rerank_model_name}...")
    cross_encoder = HuggingFaceCrossEncoder(model_name=rerank_model_name)
    print("重排模型加载完成。")
    reranker = CrossEncoderReranker(model=cross_encoder, top_n=rerank_top_n)

    compression_retriever = ContextualCompressionRetriever(
        base_retriever=base_retriever,
        base_compressor=reranker,
    )
    supabase_provider = None
    plant_status_tool = None
    recent_tasks_tool = None
    growth_journal_tool = None
    if enable_supabase:
        if not supabase_user_id:
            raise ValueError("启用 Supabase 时必须提供 user_id（参数或 SUPABASE_USER_ID 环境变量）。")
        supabase_provider = SupabaseContextProvider.from_env(user_id=supabase_user_id)
        count = supabase_provider.refresh()
        print(f"Supabase 上下文已启用，加载记录数: {count}")
        plant_status_tool = build_get_plant_status_tool(supabase_provider)
        recent_tasks_tool = build_get_recent_tasks_tool(supabase_provider)
        growth_journal_tool = build_get_growth_journal_tool(supabase_provider)

    # 生成：LLM + context stuffed
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

    print("RAG 启动完成。输入问题开始对话；`exit` 退出。")

    while True:
        q = input("\n你问：").strip()
        if not q:
            continue
        if q.lower() in {"exit", "quit"}:
            break

        # 检索（包含重排）：返回最终 top_n documents
        docs = compression_retriever.invoke(q)
        context = "\n\n---\n\n".join(d.page_content for d in docs)
        user_context = ""
        tool_result = ""
        if supabase_provider is not None:
            user_context = supabase_provider.get_relevant_context(q)
            tool_payload: dict[str, object] = {}
            if plant_status_tool is not None and _is_db_intent(q):
                tool_payload["plant_status"] = plant_status_tool.invoke({})
            if recent_tasks_tool is not None and _is_tasks_intent(q):
                task_scope = _detect_task_scope(q)
                tool_payload["recent_tasks"] = recent_tasks_tool.invoke({"scope": task_scope})
            if growth_journal_tool is not None and _is_growth_journal_intent(q):
                tool_payload["growth_journal"] = growth_journal_tool.invoke({"limit": 10})
            if tool_payload:
                tool_result = json.dumps(tool_payload, ensure_ascii=False)

        messages = prompt.format_messages(
            input=q,
            context=context,
            user_context=user_context,
            tool_result=tool_result,
        )
        resp = llm.invoke(messages)
        print("\n回答：\n" + resp.content)

        # 简单打印来源，方便你后面调参验证
        if docs:
            print("\n（来源：）")
            for i, d in enumerate(docs, 1):
                print(f"{i}. {_doc_brief(d)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chat with Chroma+Rerank RAG")
    parser.add_argument("--persist-dir", type=str, default=str(CHROMA_DIR))
    parser.add_argument("--embedding-model", type=str, default=EMBEDDING_MODEL_NAME)
    parser.add_argument("--rerank-model", type=str, default=RERANK_MODEL_NAME)
    parser.add_argument("--llm-model", type=str, default=LLM_MODEL_NAME)
    parser.add_argument("--candidate-k", type=int, default=RETRIEVAL_CANDIDATE_K)
    parser.add_argument("--rerank-top-n", type=int, default=RERANK_TOP_N)
    parser.add_argument("--temperature", type=float, default=0.2)
    parser.add_argument("--enable-supabase", action="store_true")
    parser.add_argument("--supabase-user-id", type=str, default=SUPABASE_DEFAULT_USER_ID)
    args = parser.parse_args()

    run_chat(
        persist_dir=Path(args.persist_dir),
        embedding_model_name=args.embedding_model,
        rerank_model_name=args.rerank_model,
        llm_model_name=args.llm_model,
        candidate_k=args.candidate_k,
        rerank_top_n=args.rerank_top_n,
        temperature=args.temperature,
        enable_supabase=args.enable_supabase,
        supabase_user_id=args.supabase_user_id,
    )


if __name__ == "__main__":
    main()
