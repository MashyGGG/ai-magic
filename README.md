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
| 前端 | Next.js 16, React 19, Ant Design 6, Tailwind CSS 4, React Query 5 |
| 状态管理 | Zustand 5 (auth store) |
| HTTP 客户端 | Axios (统一拦截器 + 错误处理) |
| BFF | Next.js Route Handlers |
| 认证 | 自定义 JWT + HttpOnly Cookie (jose + bcrypt) |
| 数据库 | PostgreSQL 16 (Prisma ORM) |
| 队列 | BullMQ + Redis |
| 存储 | S3 兼容 (MinIO 开发 / 云上 OSS/R2) |
| AI | MiniMax (image-01 + Hailuo 2.3-Fast)；Runway skeleton 预留 |
| 代码质量 | ESLint 9 (eslint-config-next + prettier), Prettier 3 |

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

## 开发工具

### 代码格式化 (Prettier)

```bash
pnpm format          # 格式化所有文件
pnpm format:check    # 检查格式是否一致 (CI 用)
```

配置文件: [.prettierrc](.prettierrc) — `singleQuote`, `trailingComma: all`, `printWidth: 100`

### 代码检查 (ESLint)

```bash
pnpm lint            # 运行 ESLint (apps/web)
```

ESLint 已集成 `eslint-config-prettier`，避免与 Prettier 规则冲突。

### 编辑器

项目包含 `.vscode/settings.json`，已配置保存时自动格式化 + Prettier 为默认 Formatter。

## API 客户端 (Axios)

前端所有 API 调用使用统一的 Axios 实例 (`apps/web/src/lib/axios.ts`)：

- **自动携带 Cookie**: `withCredentials: true`
- **响应拦截器**: 解包 `ApiResponse`，非 `success` 时自动 reject 为 `Error`
- **401 自动跳转**: 收到 401 时清空 auth store 并重定向到登录页
- **简化调用**: 搭配 React Query，每个 queryFn/mutationFn 只需一行

```typescript
// 示例: useQuery 中使用
queryFn: () => api.get('/api/outfits').then(r => r.data)

// 示例: useMutation 中使用
mutationFn: (data) => api.post('/api/outfits', data).then(r => r.data)
```

## 状态管理 (Zustand)

Auth Store (`apps/web/src/store/use-auth-store.ts`) 管理用户认证状态：

| Action | 说明 |
|--------|------|
| `fetchUser()` | 调用 `/api/auth/me` 加载用户信息 |
| `setUser(user)` | 直接设置用户对象 |
| `clearUser()` | 清空用户状态 |
| `logout()` | 调用登出 API + 清空状态 |

- 登录成功后自动调用 `fetchUser()` 写入 store
- App Layout 组件挂载时从 store 读取并展示用户名/角色
- 侧边栏 Header 显示当前登录用户信息

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
| 1 | 登录/角色系统 | done |
| 2 | 角色模板 CRUD + 参考图 | done |
| 3 | 穿搭任务 CRUD + Prompt 预览 + 成本预估 | done |
| 4 | MiniMax 图片/视频 Provider | done |
| 5 | BullMQ 异步队列 (图/视频/轮询/下载) | done |
| 6 | 选帧 + 视频生成触发 | done |
| 7 | 资产库 (筛选/网格/详情) | done |
| 8 | 审核流 | done |
| 9 | 成本统计 | done |
| 10 | Dashboard 首页 | done |
| 11 | 系统设置 | done |
| 12 | SSE 实时任务状态推送 | done |
| 13 | 日预算控制 | done |
| 14 | Runway skeleton | done |
| 15 | 错误边界 / 空状态 | done |
| 16 | Axios 统一 HTTP 客户端 + 拦截器 | done |
| 17 | Zustand Auth Store (登录态管理) | done |
| 18 | ESLint + Prettier 代码质量工具链 | done |
| 19 | Ant Design v5 -> v6 兼容升级 | done |

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
- Vercel 部署
