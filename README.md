# 穿搭推荐视频生成系统

低成本、可批量、可追踪的穿搭展示短视频生产工具。通过文生图/参考图生图获得稳定首帧，再由图生视频生成短视频。

## 架构

```
ai-magic/
├── apps/
│   ├── web/          # Next.js 16 App Router (前端 + BFF API)
│   └── worker/       # BullMQ Worker (异步任务处理)
├── packages/
│   ├── db/           # Prisma ORM + PostgreSQL schema
│   ├── shared/       # 共享类型、API 响应、错误码、Zod schema
│   ├── providers/    # AI 厂商抽象层 (MiniMax / Runway skeleton)
│   └── prompts/      # Prompt 模板与构建器
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16, React 19, Ant Design 5, Tailwind CSS 4, React Query 5, Zustand |
| BFF | Next.js Route Handlers |
| 认证 | 自定义 JWT + HttpOnly Cookie (jose + bcrypt) |
| 数据库 | PostgreSQL 16 (Prisma ORM) |
| 队列 | BullMQ + Redis |
| 存储 | S3 兼容 (MinIO 开发 / 云上 OSS/R2) |
| AI | MiniMax (image-01 + Hailuo 2.3-Fast)；Runway skeleton 预留 |

## 快速启动

### 前置条件

- Node.js >= 18.17 (推荐 22 LTS)
- pnpm
- Docker Desktop (用于本地 PostgreSQL + Redis + MinIO)

### 一键启动

```bash
# 1. 克隆并安装依赖
pnpm install

# 2. 启动基础设施
docker compose up -d

# 3. 复制环境变量
cp .env.example .env

# 4. 数据库迁移
pnpm db:push

# 5. 生成 Prisma Client
pnpm db:generate

# 6. 创建种子用户
pnpm db:seed

# 7. 启动开发服务器
pnpm dev

# 8. (另一个终端) 启动 Worker
pnpm dev:worker
```

### 默认账号

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | admin123 | ADMIN |
| editor@example.com | editor123 | EDITOR |
| reviewer@example.com | reviewer123 | REVIEWER |

## 环境变量

参见 [.env.example](.env.example)

| 变量 | 说明 |
|------|------|
| DATABASE_URL | PostgreSQL 连接字符串 |
| REDIS_URL | Redis 连接地址 |
| JWT_SECRET | JWT 签名密钥 (>=32字符) |
| S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY | 对象存储配置 |
| MINIMAX_API_KEY | MiniMax API 密钥 |
| RUNWAY_API_KEY | Runway API 密钥 (预留) |

## API 概览

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 当前用户

### 角色模板
- `GET /POST /api/character-templates` - 列表/创建
- `GET /PATCH /DELETE /api/character-templates/:id` - 详情/更新/删除

### 穿搭任务
- `GET /POST /api/outfits` - 列表/创建
- `GET /PATCH /api/outfits/:id` - 详情/更新

### 生成任务
- `POST /api/generations/image` - 发起图片生成
- `POST /api/generations/video` - 发起视频生成
- `GET /api/jobs/:id` - 查询任务状态
- `POST /api/jobs/:id/retry` - 重试任务
- `GET /api/jobs/:id/events` - SSE 实时状态推送

### 资产
- `GET /api/assets` - 资产列表
- `GET /api/assets/:id` - 资产详情
- `GET /api/assets/:id/url` - 获取签名 URL
- `POST /api/assets/:id/select-frame` - 选帧
- `POST /api/upload` - 上传文件

### 审核 / 成本 / 设置
- `GET /POST /api/reviews` - 审核
- `GET /api/costs/summary` - 成本汇总
- `GET /api/dashboard/summary` - 仪表盘数据
- `GET /PATCH /api/settings` - 系统设置

## Provider 设计

所有 AI 厂商实现统一的 `AiProvider` 接口：

```typescript
interface AiProvider {
  name: string;
  generateImages(input): Promise<GenerateImagesResult>;
  generateVideoFromImage(input): Promise<GenerateVideoTaskResult>;
  getTask(taskId): Promise<ProviderTaskStatusResult>;
  downloadAsset(input): Promise<DownloadAssetResult>;
  estimateCost(input): CostEstimate;
  getCapabilities(): ProviderCapabilities;
}
```

当前已实现：
- **MiniMax** - 完整实现 (image-01 图片生成 + Hailuo 2.3-Fast 视频生成)
- **Runway** - Skeleton (estimateCost 已实现，其他方法待 API Key 后接入)

## MVP 完成清单

| # | 功能 | 状态 |
|---|------|------|
| 1 | 登录/角色系统 | ✅ |
| 2 | 角色模板 CRUD + 参考图 | ✅ |
| 3 | 穿搭任务 CRUD + Prompt 预览 + 成本预估 | ✅ |
| 4 | MiniMax 图片/视频 Provider | ✅ |
| 5 | BullMQ 异步队列 (图/视频/轮询/下载) | ✅ |
| 6 | 选帧 + 视频生成触发 | ✅ |
| 7 | 资产库 (筛选/网格/详情) | ✅ |
| 8 | 审核流 | ✅ |
| 9 | 成本统计 | ✅ |
| 10 | Dashboard 首页 | ✅ |
| 11 | 系统设置 | ✅ |
| 12 | SSE 实时任务状态推送 | ✅ |
| 13 | 日预算控制 | ✅ |
| 14 | Runway skeleton | ✅ |
| 15 | 错误边界 / 空状态 | ✅ |

## 后续待办 (第二阶段)

- Runway 实际接入
- 即梦 (Jimeng) Provider
- 批量导入穿搭数据
- AI 质检 (自动评估生成质量)
- 爆款模板 (高转化率模板推荐)
- 商品库联动
- 权限细化 (RBAC)
- Sentry 错误监控
- CI/CD 流水线
