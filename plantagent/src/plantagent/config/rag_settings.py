from __future__ import annotations

import os
from pathlib import Path

# Project root: .../plantagent/src/plantagent/config/rag_settings.py -> parents[3] is repo root
ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data"

# Your knowledge base (already prepared)
KNOWLEDGE_PATH = DATA_DIR / "knowledge.md"

# Persisted local vector index
CHROMA_DIR = DATA_DIR / "chroma_knowledge"

# Chunking (你要求的初始参数)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150

# Retrieval
RETRIEVAL_CANDIDATE_K = 30
RERANK_TOP_N = 5

# Embedding model (本地 sentence-transformers)
EMBEDDING_MODEL_NAME = "BAAI/bge-small-zh-v1.5"

# Cross-encoder reranker (HuggingFace)
# RERANK_MODEL_NAME = "BAAI/bge-reranker-base"
RERANK_MODEL_NAME = r"E:\cursor_workspace\plant-care-project-main\plantagent\models\bge-reranker-base"

# LLM generation (DashScope / Tongyi Qwen)
LLM_MODEL_NAME = "qwen-turbo"

SUPABASE_URL = "https://icbjumixbmdjcrthfgas.supabase.co"
SUPABASE_KEY = "sb_publishable_ibqaQMt0P_-TV-q8OHUT3Q_YXGacHDF"

"""当前用户在supabase中的ID"""
SUPABASE_DEFAULT_USER_ID = "ff943d22-ed57-4877-b18d-6622b1e223de"

