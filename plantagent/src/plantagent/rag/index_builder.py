from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from langchain_community.document_loaders import TextLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from plantagent.config.rag_settings import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    CHROMA_DIR,
    EMBEDDING_MODEL_NAME,
    KNOWLEDGE_PATH,
)


def load_and_chunk_markdown(
    knowledge_path: Path,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> list[Document]:
    """将 knowledge.md 分片成适合向量检索的 chunks，并保留章节元数据。"""

    if not knowledge_path.exists():
        raise FileNotFoundError(f"knowledge.md not found: {knowledge_path}")

    loader = TextLoader(str(knowledge_path), encoding="utf-8")
    raw_docs = loader.load()
    text = raw_docs[0].page_content if raw_docs else knowledge_path.read_text(encoding="utf-8")

    # 第一段切分：按 Markdown 标题层级切分，便于后续“重排后仍能定位章节”
    headers_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("##", "h2"),
            ("###", "h3"),
            ("####", "h4"),
            ("#####", "h5"),
            ("######", "h6"),
        ]
    )
    header_docs = headers_splitter.split_text(text)

    # 第二段切分：按长度切分，控制 chunk 大小（你要求的 chunk_size=1000）
    size_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            "。",
            "！",
            "？",
            "；",
            "：",
            "、",
            " ",
        ],
    )

    final_docs: list[Document] = []
    for hd in header_docs:
        # MarkdownHeaderTextSplitter.split_text 返回 Document 列表，page_content 已去掉标题
        chunks = size_splitter.split_text(hd.page_content)
        for ch in chunks:
            final_docs.append(Document(page_content=ch, metadata=dict(hd.metadata)))

    return final_docs


def build_index(
    knowledge_path: Path = KNOWLEDGE_PATH,
    persist_dir: Path = CHROMA_DIR,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
    embedding_model_name: str = EMBEDDING_MODEL_NAME,
    force_rebuild: bool = False,
) -> int:
    """构建并持久化知识库向量索引，返回 chunk 数量。"""

    if force_rebuild and persist_dir.exists():
        shutil.rmtree(persist_dir)

    docs = load_and_chunk_markdown(
        knowledge_path=knowledge_path,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    persist_dir.mkdir(parents=True, exist_ok=True)

    embeddings = HuggingFaceEmbeddings(model_name=embedding_model_name)

    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=str(persist_dir),
    )
    vectorstore.persist()
    return len(docs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Chroma index for knowledge.md")
    parser.add_argument("--knowledge", type=str, default=str(KNOWLEDGE_PATH))
    parser.add_argument("--persist-dir", type=str, default=str(CHROMA_DIR))
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE)
    parser.add_argument("--chunk-overlap", type=int, default=CHUNK_OVERLAP)
    parser.add_argument("--embedding-model", type=str, default=EMBEDDING_MODEL_NAME)
    parser.add_argument("--force-rebuild", action="store_true")

    args = parser.parse_args()

    num = build_index(
        knowledge_path=Path(args.knowledge),
        persist_dir=Path(args.persist_dir),
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        embedding_model_name=args.embedding_model,
        force_rebuild=args.force_rebuild,
    )
    print(f"Indexed chunks: {num}")


if __name__ == "__main__":
    main()

