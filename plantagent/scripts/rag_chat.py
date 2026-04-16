from __future__ import annotations

import sys
import site
from pathlib import Path

# 让脚本能直接 import src 里的包（无需安装）
user_site = site.getusersitepackages()
if user_site:
    sys.path = [p for p in sys.path if not p.startswith(user_site)]

# 同时清理掉常见的用户级 Python roaming 路径，避免它覆盖 conda 环境依赖
sys.path = [p for p in sys.path if "AppData\\Roaming\\Python" not in p]

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from plantagent.rag.rag_chat import main


if __name__ == "__main__":
    main()

