# 植觉 PlantSense / 植物养护项目

本仓库包含 **后端 FastAPI**（`plant-care-backend`）与 **前端 Expo 应用**（`plantsense-app`）。环境与联调步骤见 **[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)**。

## 目录结构（简要）

| 目录 | 说明 |
|------|------|
| `plant-care-backend` | FastAPI：鉴权、植物分析、预测、百科、聊天等 API |
| `plantsense-app` | 主用前端：Expo SDK 52，植觉 App |
| `plant-care-app(wasted)` | 旧版前端（备份），日常开发以 `plantsense-app` 为准 |
| `user_photo` | 后端上传图片目录（由 `UPLOAD_DIR` 指定） |
| `gorgeous_background`、`stitch` 等 | 设计稿/素材，可选 |

## 五分钟跑起来

1. **MySQL**：创建数据库 `plant`，用户名/密码与本机 `plant-care-backend/.env` 一致。
2. **后端**：`cd plant-care-backend` → 创建虚拟环境 → `pip install -r requirements.txt` → 复制 `.env.example` 为 `.env`（或与示例内容一致）→ `uvicorn main:app --reload --host 0.0.0.0 --port 3000`
3. **前端**：`cd plantsense-app` → `npm install` → 若电脑 IP 不是 `192.168.43.175`，修改 `plantsense-app/constants/index.ts` 中的 `API_URL` → `npx expo start --lan`（请在项目目录下执行，不要在 `C:\Windows\System32`）

详细说明、端口与防火墙见 [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)。

## 配置与本机对齐说明

- 后端环境变量示例：`plant-care-backend/.env.example`（与当前团队使用的 `.env` 字段一致）。
- 默认局域网 API 地址：`http://192.168.43.175:3000/api`（见 `plantsense-app/constants/index.ts`）；协作者需改为自己电脑的局域网 IP。
