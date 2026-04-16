"""
RAG 系统诊断工具
用于检测 API Key、模型连接、依赖版本等配置问题
"""

import os
import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))


# 颜色输出
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


def print_status(status: bool, message: str):
    color = Colors.GREEN if status else Colors.RED
    symbol = "✓" if status else "✗"
    print(f"{color}{symbol} {message}{Colors.END}")


def print_info(message: str):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")


def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")


# ============== 1. 检查环境变量 ==============
def check_env():
    print("\n" + "=" * 50)
    print("1. 检查环境变量配置")
    print("=" * 50)

    api_key = os.getenv("DASHSCOPE_API_KEY")
    if api_key and api_key.startswith("sk-"):
        print_status(True, f"DASHSCOPE_API_KEY 已配置 (前缀: {api_key[:8]}...)")
        return api_key
    else:
        print_status(False, "DASHSCOPE_API_KEY 未配置或格式错误")
        print_info("请在终端执行: $env:DASHSCOPE_API_KEY='sk-...'")
        return None


# ============== 2. 检查依赖版本 ==============
def check_versions():
    print("\n" + "=" * 50)
    print("2. 检查依赖包版本")
    print("=" * 50)

    packages = [
        "langchain",
        "langchain_community",
        "langchain_core",
        "dashscope",
        "requests",
    ]

    versions = {}
    for pkg in packages:
        try:
            import importlib.metadata as m
            version = m.version(pkg)
            versions[pkg] = version
            print_status(True, f"{pkg}: v{version}")
        except Exception as e:
            print_status(False, f"{pkg}: 未安装 ({e})")

    # 版本兼容性检查
    print_info("版本兼容性建议:")
    print_info("  - langchain-community >= 0.2.5")
    print_info("  - dashscope >= 1.14.0")
    print_info("  - requests >= 2.31.0")

    return versions


# ============== 3. 检查 DashScope 连接 ==============
def check_dashscope_connection(api_key: str):
    print("\n" + "=" * 50)
    print("3. 测试 DashScope API 连接")
    print("=" * 50)

    if not api_key:
        print_status(False, "跳过测试 (API Key 缺失)")
        return False

    try:
        import dashscope
        from dashscope import Generation

        dashscope.api_key = api_key

        # 测试调用
        response = Generation.call(
            model="qwen-turbo",
            messages=[{"role": "user", "content": "你好"}],
            max_tokens=10
        )

        if response.status_code == 200:
            print_status(True, "DashScope API 连接成功")
            print_info(f"响应: {response.output.text[:50]}...")
            return True
        else:
            print_status(False, f"DashScope API 连接失败 (代码: {response.status_code})")
            print_info(f"错误信息: {response.message}")
            return False

    except Exception as e:
        print_status(False, f"DashScope 测试异常: {type(e).__name__}")
        print_info(f"详细信息: {str(e)}")
        return False


# ============== 4. 检查 LangChain Tongyi 连接 ==============
def check_langchain_tongyi(api_key: str):
    print("\n" + "=" * 50)
    print("4. 测试 LangChain ChatTongyi 连接")
    print("=" * 50)

    if not api_key:
        print_status(False, "跳过测试 (API Key 缺失)")
        return False

    try:
        from langchain_community.chat_models import ChatTongyi

        llm = ChatTongyi(
            model="qwen-turbo",
            dashscope_api_key=api_key,
            max_tokens=10
        )

        response = llm.invoke("你好")
        print_status(True, "LangChain ChatTongyi 调用成功")
        print_info(f"响应: {str(response.content)[:50]}...")
        return True

    except KeyError as e:
        print_status(False, f"KeyError (版本兼容性问题): {e}")
        print_info("建议执行: pip install -U langchain-community dashscope")
        return False
    except Exception as e:
        print_status(False, f"LangChain 测试异常: {type(e).__name__}")
        print_info(f"详细信息: {str(e)}")
        return False


# ============== 5. 检查 Embedding 模型 ==============
def check_embedding():
    print("\n" + "=" * 50)
    print("5. 测试 Embedding 模型加载")
    print("=" * 50)

    try:
        # 尝试新包
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
            print_info("使用: langchain_huggingface (推荐)")
        except ImportError:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            print_warning("使用: langchain_community (已弃用)")

        embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-zh-v1.5")
        test_text = "测试文本"
        vector = embeddings.embed_query(test_text)

        print_status(True, f"Embedding 模型加载成功 (向量维度: {len(vector)})")
        return True

    except Exception as e:
        print_status(False, f"Embedding 测试异常: {type(e).__name__}")
        print_info(f"详细信息: {str(e)}")
        return False


# ============== 6. 检查 Chroma 向量库 ==============
def check_chroma():
    print("\n" + "=" * 50)
    print("6. 测试 Chroma 向量库")
    print("=" * 50)

    try:
        # 尝试新包
        try:
            from langchain_chroma import Chroma
            print_info("使用: langchain_chroma (推荐)")
        except ImportError:
            from langchain_community.vectorstores import Chroma
            print_warning("使用: langchain_community (已弃用)")

        from langchain_huggingface import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-zh-v1.5")

        # 创建临时向量库
        vectorstore = Chroma(
            collection_name="test_collection",
            embedding_function=embeddings,
            persist_directory="./.chroma_test"
        )

        # 测试添加和查询
        vectorstore.add_texts(["测试文档"])
        results = vectorstore.similarity_search("测试", k=1)

        print_status(True, f"Chroma 向量库测试成功 (找到 {len(results)} 条结果)")

        # 清理测试文件
        import shutil
        if os.path.exists("./.chroma_test"):
            shutil.rmtree("./.chroma_test")

        return True

    except Exception as e:
        print_status(False, f"Chroma 测试异常: {type(e).__name__}")
        print_info(f"详细信息: {str(e)}")
        return False


# ============== 7. 检查 Supabase 连接 ==============
def check_supabase():
    print("\n" + "=" * 50)
    print("7. 测试 Supabase 连接 (可选)")
    print("=" * 50)

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print_warning("Supabase 环境变量未配置，跳过测试")
        return None

    try:
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)

        # 测试连接
        response = client.table("documents").select("id").limit(1).execute()

        print_status(True, "Supabase 连接成功")
        print_info(f"表 documents 可访问")
        return True

    except Exception as e:
        print_status(False, f"Supabase 测试异常: {type(e).__name__}")
        print_info(f"详细信息: {str(e)}")
        return False


# ============== 主函数 ==============
def main():
    print("\n")
    print("╔" + "=" * 48 + "╗")
    print("║" + " " * 15 + "RAG 系统诊断工具" + " " * 15 + "║")
    print("╚" + "=" * 48 + "╝")

    # 执行检查
    api_key = check_env()
    versions = check_versions()
    ds_ok = check_dashscope_connection(api_key)
    lc_ok = check_langchain_tongyi(api_key)
    emb_ok = check_embedding()
    chroma_ok = check_chroma()
    supabase_ok = check_supabase()

    # 总结
    print("\n" + "=" * 50)
    print("诊断总结")
    print("=" * 50)

    checks = [
        ("API Key 配置", api_key is not None),
        ("DashScope 直连", ds_ok),
        ("LangChain Tongyi", lc_ok),
        ("Embedding 模型", emb_ok),
        ("Chroma 向量库", chroma_ok),
    ]

    all_passed = True
    for name, status in checks:
        symbol = "✓" if status else "✗"
        color = Colors.GREEN if status else Colors.RED
        print(f"{color}{symbol} {name}{Colors.END}")
        if not status:
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print(f"{Colors.GREEN}所有检查通过！可以正常运行 RAG 系统{Colors.END}")
    else:
        print(f"{Colors.RED}部分检查失败，请根据上述提示修复{Colors.END}")
        print("\n建议修复步骤:")
        print("  1. 设置 API Key: $env:DASHSCOPE_API_KEY='sk-...'")
        print("  2. 升级依赖: pip install -U langchain-community dashscope")
        print("  3. 安装新包: pip install langchain-huggingface langchain-chroma")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()