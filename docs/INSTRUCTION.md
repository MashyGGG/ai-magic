# Cursor 执行文档（二）：PRD + 数据库表结构 + API 定义 + 页面原型说明

## 1. 产品 PRD

### 1.1 产品名称

穿搭推荐视频生成系统

### 1.2 产品定位

一个面向内容团队、电商团队、AI 创作团队的生产型工具。
核心不是“随便生成视频”，而是：

**低成本、可批量、可追踪地生成稳定首帧，并基于首帧生成可用的穿搭展示短视频。**

### 1.3 核心业务价值

本系统用于解决以下问题：

1. 直接文生视频时，人物脸不稳定、服装细节漂移严重。
2. 穿搭类内容对首帧质量要求极高，尤其是服装版型、材质、纹理、配色。
3. 视频生成是异步任务，普通网页直连不适合真实生产。
4. 缺少任务追踪、成本统计、结果沉淀，会导致后续无法批量化。
5. 一旦后续需要更换模型供应商，如果没有 Provider 抽象层，迁移成本会很高。

### 1.4 目标用户

#### 用户角色 A：运营 / 内容策划

负责输入穿搭需求，批量出图、出视频，挑选可用内容。

#### 用户角色 B：设计 / 审核人员

负责审核首帧图和视频结果，判断是否可投放、可发布。

#### 用户角色 C：管理员 / 技术负责人

负责模型配置、成本控制、供应商切换、系统设置。

### 1.5 核心场景

#### 场景 1：快速打样

运营输入一套穿搭描述，系统生成 4 张首帧图，选 1 张继续生成 2 条短视频。

#### 场景 2：批量生产

内容团队导入多套穿搭任务，系统批量排队生成首帧与视频，审核通过后沉淀到资产库。

#### 场景 3：复用爆款模板

选中某次高转化任务，复用角色模板、镜头模板、动作模板，替换服装描述重新生成。

### 1.6 产品目标

#### MVP 目标

实现最小闭环：

1. 登录
2. 角色模板管理
3. 穿搭任务创建
4. 首帧生成
5. 人工选首帧
6. 图生视频
7. 资产入库
8. 审核状态
9. 成本记录
10. 基础数据统计

#### 第二阶段目标

1. 多 Provider 切换
2. 自动质检打分
3. 批量导入任务
4. 爆款模板复用
5. 商品库联动
6. 国际模型接入
7. 自动剪辑成片

### 1.7 非目标

当前版本不做：

1. 复杂编舞生成
2. 长视频叙事
3. 多租户 SaaS 商业化权限系统
4. 完整财务计费系统
5. 自动生成最终广告成片

### 1.8 成功指标

#### 业务指标

1. 首帧可用率 ≥ 50%
2. 视频可用率 ≥ 30%
3. 单套穿搭平均试错成本可控
4. 单任务全流程可追踪
5. 爆款任务可复现

#### 技术指标

1. 所有任务有状态机
2. 所有外部调用有日志
3. 所有资产落自有存储
4. 所有成本可落库汇总
5. Provider 可替换

---

## 2. 功能需求清单

## 2.1 登录与权限

### 功能

* 用户登录
* 用户登出
* 查看当前用户信息

### 角色

* admin
* editor
* reviewer

### 权限建议

* admin：全部权限
* editor：创建任务、查看资产、重试任务
* reviewer：审核、查看资产、查看任务

---

## 2.2 角色模板管理

### 功能

* 创建角色模板
* 编辑角色模板
* 上传参考图
* 选择默认镜头模板
* 选择默认动作模板
* 查看模板历史生成结果

### 字段

* 模板名称
* 性别风格
* 年龄感
* 脸型描述
* 发型描述
* 肤色描述
* 身材描述
* 气质风格
* 参考图
* 默认背景
* 默认镜头
* 默认动作

### 业务规则

1. 至少允许一个参考图。
2. 模板可被多个穿搭任务复用。
3. 模板删除前必须检查是否被任务引用。

---

## 2.3 穿搭任务创建

### 功能

* 新建穿搭任务
* 选择角色模板
* 输入服装与场景描述
* 选择 Provider 和模型
* 提交首帧生成任务

### 字段

* 任务标题
* 角色模板
* 上装描述
* 下装描述
* 鞋子描述
* 包描述
* 配饰描述
* 面料 / 材质描述
* 配色描述
* 背景描述
* 场景描述
* 镜头模板
* 动作模板
* 比例
* 时长
* 分辨率
* 图片模型
* 视频模型
* 生成张数
* 视频条数

### 业务规则

1. 默认先生成首帧，不直接生成视频。
2. 默认图片生成 4 张，视频生成 2 条。
3. 默认视频时长 4–6 秒。
4. 默认动作只能选轻动作模板。

---

## 2.4 首帧生成

### 功能

* 提交图片生成任务
* 返回多张候选首帧
* 展示任务状态
* 保存 prompt / seed / model / cost / asset

### 业务规则

1. 必须记录每张图对应的生成任务。
2. 生成成功后自动下载图片到对象存储。
3. 支持将某张图标记为“视频首帧”。

---

## 2.5 首帧筛选

### 功能

* 人工选择最佳首帧
* 标记废弃图
* 添加审核备注

### 可选增强

* 自动质量打分
* “推荐作为首帧”标签

### 业务规则

1. 一套穿搭可以选择多张首帧用于不同视频尝试。
2. 只有被标记为可用的首帧，才能发起视频生成。

---

## 2.6 图生视频

### 功能

* 基于选定首帧发起视频任务
* 轮询任务状态
* 生成成功后下载视频
* 自动入库
* 记录成本和耗时

### 业务规则

1. 视频生成必须引用一个输入图片资产。
2. 视频状态必须有完整状态机。
3. 支持重试。
4. 支持不同 Provider 的统一展示。

---

## 2.7 资产库

### 功能

* 查看图片资产
* 查看视频资产
* 预览
* 下载
* 筛选
* 按任务追溯来源

### 筛选维度

* 类型
* Provider
* 模型
* 创建时间
* 审核状态
* 是否爆款模板来源
* 是否已归档

---

## 2.8 审核流

### 功能

* 审核图片
* 审核视频
* 记录意见
* 标记通过 / 拒绝

### 状态

* draft
* generated
* reviewing
* approved
* rejected
* archived

### 业务规则

1. 图片和视频都可审核。
2. 审核意见必须落库。
3. 一条资产可存在多条审核记录。

---

## 2.9 成本与统计

### 功能

* 查看单任务成本
* 查看单日成本
* 查看按模型成本
* 查看成功率
* 查看失败率
* 查看重试次数

### 业务规则

1. 成本必须按任务记录。
2. 成本必须支持不同货币。
3. 如果厂商只返回 credits，也要换算为实际金额并记录原始账单 JSON。

---

## 2.10 系统设置

### 功能

* 配置 Provider API Key
* 配置对象存储
* 配置默认模型
* 配置默认参数
* 配置重试策略

---

# 3. 业务流程说明

## 3.1 主流程

1. 用户创建穿搭任务
2. 选择角色模板与穿搭描述
3. 发起首帧生成
4. 系统生成 4 张候选图
5. 用户选择 1 张或多张可用首帧
6. 发起图生视频任务
7. Worker 轮询结果
8. 成功后下载视频并入库
9. 审核
10. 可复用 / 可归档 / 可统计

## 3.2 异常流程

### 图片生成失败

* 标记任务失败
* 记录错误
* 支持重试

### 视频生成失败

* 标记失败
* 保留输入首帧
* 支持重新生成

### 下载失败

* 标记为 `download_failed`
* 支持单独重试下载

---

# 4. 数据库表结构设计

建议使用 PostgreSQL + Prisma。

---

## 4.1 枚举定义

```prisma
enum UserRole {
  ADMIN
  EDITOR
  REVIEWER
}

enum ProviderName {
  MINIMAX
  RUNWAY
  JIMENG
  OPENAI
}

enum JobStage {
  IMAGE
  VIDEO
}

enum JobStatus {
  PENDING
  QUEUED
  RUNNING
  SUCCEEDED
  FAILED
  CANCELED
  RETRYING
  DOWNLOAD_FAILED
}

enum AssetType {
  IMAGE
  VIDEO
}

enum ReviewStatus {
  DRAFT
  GENERATED
  REVIEWING
  APPROVED
  REJECTED
  ARCHIVED
}

enum BillingUnit {
  PER_IMAGE
  PER_SECOND
  CREDIT
  TOKEN
  FIXED
}
```

---

## 4.2 users

```prisma
model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String?
  role         UserRole @default(EDITOR)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  characterTemplates CharacterTemplate[]
  outfits            Outfit[]
  reviews            ReviewRecord[]
}
```

---

## 4.3 character_templates

```prisma
model CharacterTemplate {
  id               String   @id @default(cuid())
  name             String
  description      String?
  genderStyle      String?
  ageStyle         String?
  faceDesc         String?
  hairDesc         String?
  skinDesc         String?
  bodyDesc         String?
  vibeDesc         String?
  defaultScene     String?
  defaultCamera    String?
  defaultMotion    String?
  referenceAssetId String?
  createdById      String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  createdBy   User    @relation(fields: [createdById], references: [id])
  referenceAsset Asset? @relation("CharacterReferenceAsset", fields: [referenceAssetId], references: [id])
  outfits     Outfit[]
}
```

---

## 4.4 outfits

```prisma
model Outfit {
  id                  String       @id @default(cuid())
  title               String
  characterTemplateId String
  topDesc             String?
  bottomDesc          String?
  shoesDesc           String?
  bagDesc             String?
  accessoriesDesc     String?
  materialDesc        String?
  colorDesc           String?
  backgroundDesc      String?
  sceneDesc           String?
  cameraTemplate      String?
  motionTemplate      String?
  aspectRatio         String?
  durationSec         Int?
  resolution          String?
  providerPreference  ProviderName?
  imageModel          String?
  videoModel          String?
  status              ReviewStatus @default(DRAFT)
  createdById         String
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  characterTemplate CharacterTemplate @relation(fields: [characterTemplateId], references: [id])
  createdBy         User              @relation(fields: [createdById], references: [id])
  generationJobs    GenerationJob[]
  reviews           ReviewRecord[]
}
```

---

## 4.5 generation_jobs

```prisma
model GenerationJob {
  id               String       @id @default(cuid())
  outfitId         String
  stage            JobStage
  provider         ProviderName
  model            String
  inputAssetId     String?
  outputAssetId    String?
  providerTaskId   String?
  providerFileId   String?
  status           JobStatus    @default(PENDING)
  promptText       String?
  promptJson       Json?
  seed             Int?
  candidateIndex   Int?
  durationSec      Int?
  resolution       String?
  errorMessage     String?
  retryCount       Int          @default(0)
  startedAt        DateTime?
  finishedAt       DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  outfit      Outfit @relation(fields: [outfitId], references: [id])
  inputAsset  Asset? @relation("JobInputAsset", fields: [inputAssetId], references: [id])
  outputAsset Asset? @relation("JobOutputAsset", fields: [outputAssetId], references: [id])
  costs       CostLedger[]
}
```

---

## 4.6 assets

```prisma
model Asset {
  id              String       @id @default(cuid())
  type            AssetType
  mimeType        String?
  width           Int?
  height          Int?
  durationMs      Int?
  provider        ProviderName?
  providerFileId  String?
  providerUrl     String?
  storageBucket   String?
  storageKey      String?
  sha256          String?
  fileSize        Int?
  metadataJson    Json?
  reviewStatus    ReviewStatus @default(GENERATED)
  isSelectedFrame Boolean      @default(false)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  characterReferences CharacterTemplate[] @relation("CharacterReferenceAsset")
  jobInputRefs        GenerationJob[]     @relation("JobInputAsset")
  jobOutputRefs       GenerationJob[]     @relation("JobOutputAsset")
  reviews             ReviewRecord[]
}
```

---

## 4.7 cost_ledgers

```prisma
model CostLedger {
  id             String       @id @default(cuid())
  generationJobId String
  provider       ProviderName
  model          String
  currency       String
  amount         Decimal      @db.Decimal(12, 4)
  billingUnit    BillingUnit
  rawBillingJson Json?
  createdAt      DateTime     @default(now())

  generationJob GenerationJob @relation(fields: [generationJobId], references: [id])
}
```

---

## 4.8 review_records

```prisma
model ReviewRecord {
  id         String       @id @default(cuid())
  outfitId   String?
  assetId    String?
  reviewerId String
  status     ReviewStatus
  comment    String?
  createdAt  DateTime     @default(now())

  outfit    Outfit? @relation(fields: [outfitId], references: [id])
  asset     Asset?  @relation(fields: [assetId], references: [id])
  reviewer  User    @relation(fields: [reviewerId], references: [id])
}
```

---

## 4.9 system_settings

建议单独建配置表。

```prisma
model SystemSetting {
  id         String   @id @default(cuid())
  key        String   @unique
  value      Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

---

# 5. API 定义

建议全部使用 REST 风格，后端由 Next.js Route Handlers 提供，Worker 消费 Redis/BullMQ 队列。

---

## 5.1 认证

### POST `/api/auth/login`

请求：

```json
{
  "email": "admin@example.com",
  "password": "123456"
}
```

响应：

```json
{
  "success": true,
  "user": {
    "id": "u_1",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### POST `/api/auth/logout`

### GET `/api/auth/me`

---

## 5.2 角色模板

### GET `/api/character-templates`

作用：查询模板列表

查询参数：

* `keyword`
* `page`
* `pageSize`

响应：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

### POST `/api/character-templates`

请求：

```json
{
  "name": "都市轻奢女模特A",
  "description": "适合通勤穿搭",
  "genderStyle": "female",
  "ageStyle": "25-30",
  "faceDesc": "鹅蛋脸，五官立体",
  "hairDesc": "黑长直",
  "skinDesc": "自然白皙",
  "bodyDesc": "高挑匀称",
  "vibeDesc": "轻奢都市感",
  "defaultScene": "极简摄影棚",
  "defaultCamera": "45度全身",
  "defaultMotion": "站立轻摆",
  "referenceAssetId": "asset_xxx"
}
```

### GET `/api/character-templates/:id`

### PATCH `/api/character-templates/:id`

### DELETE `/api/character-templates/:id`

---

## 5.3 穿搭任务

### GET `/api/outfits`

查询参数：

* `status`
* `provider`
* `page`
* `pageSize`
* `keyword`

### POST `/api/outfits`

请求：

```json
{
  "title": "春季通勤西装裙穿搭",
  "characterTemplateId": "ct_001",
  "topDesc": "浅灰修身西装外套",
  "bottomDesc": "同色系短裙",
  "shoesDesc": "黑色尖头高跟鞋",
  "bagDesc": "小号皮质手提包",
  "accessoriesDesc": "金属耳环",
  "materialDesc": "西装面料有轻微纹理",
  "colorDesc": "浅灰 + 黑色点缀",
  "backgroundDesc": "干净高级的都市摄影棚",
  "sceneDesc": "商业时尚广告风",
  "cameraTemplate": "45度全身",
  "motionTemplate": "轻微转身",
  "aspectRatio": "9:16",
  "durationSec": 6,
  "resolution": "1080p",
  "providerPreference": "MINIMAX",
  "imageModel": "image-01",
  "videoModel": "Hailuo-2.3-Fast"
}
```

### GET `/api/outfits/:id`

返回：

* 任务详情
* 角色模板
* 所有关联首帧任务
* 所有关联视频任务
* 资产列表
* 审核记录
* 成本汇总

### PATCH `/api/outfits/:id`

---

## 5.4 图片生成任务

### POST `/api/generations/image`

作用：提交首帧生成任务

请求：

```json
{
  "outfitId": "outfit_001",
  "provider": "MINIMAX",
  "model": "image-01",
  "count": 4,
  "useReference": true
}
```

响应：

```json
{
  "success": true,
  "jobIds": ["job_1", "job_2", "job_3", "job_4"]
}
```

### GET `/api/jobs/:id`

返回任务详情：

```json
{
  "id": "job_1",
  "stage": "IMAGE",
  "status": "SUCCEEDED",
  "provider": "MINIMAX",
  "model": "image-01",
  "promptText": "...",
  "seed": 12345,
  "outputAssetId": "asset_1",
  "errorMessage": null
}
```

---

## 5.5 选择首帧

### POST `/api/assets/:id/select-frame`

请求：

```json
{
  "outfitId": "outfit_001",
  "selected": true
}
```

作用：

* 将该图片设为可用首帧
* 可支持同一 outfit 多选

---

## 5.6 视频生成任务

### POST `/api/generations/video`

请求：

```json
{
  "outfitId": "outfit_001",
  "inputAssetId": "asset_frame_001",
  "provider": "MINIMAX",
  "model": "Hailuo-2.3-Fast",
  "count": 2,
  "durationSec": 6,
  "resolution": "1080p"
}
```

响应：

```json
{
  "success": true,
  "jobIds": ["video_job_1", "video_job_2"]
}
```

---

## 5.7 重试任务

### POST `/api/jobs/:id/retry`

请求：

```json
{
  "reason": "人物手部异常，重新生成"
}
```

业务规则：

* 只能重试失败或已完成任务
* 自动继承原始参数
* 增加 retryCount

---

## 5.8 资产库

### GET `/api/assets`

查询参数：

* `type`
* `provider`
* `reviewStatus`
* `page`
* `pageSize`
* `outfitId`

### GET `/api/assets/:id`

返回：

* 资产详情
* 来源任务
* 来源 outfit
* 成本
* 审核记录

---

## 5.9 审核

### POST `/api/reviews`

请求：

```json
{
  "outfitId": "outfit_001",
  "assetId": "asset_001",
  "status": "APPROVED",
  "comment": "人物稳定，服装细节清晰，可继续投放"
}
```

### GET `/api/reviews`

支持按 `assetId` 或 `outfitId` 查询

---

## 5.10 成本统计

### GET `/api/costs/summary`

查询参数：

* `startDate`
* `endDate`
* `provider`
* `model`

响应：

```json
{
  "totalAmount": 125.32,
  "currency": "CNY",
  "byProvider": [
    { "provider": "MINIMAX", "amount": 98.20 },
    { "provider": "RUNWAY", "amount": 27.12 }
  ],
  "byModel": [
    { "model": "image-01", "amount": 10.00 },
    { "model": "Hailuo-2.3-Fast", "amount": 88.20 }
  ],
  "jobCount": 240,
  "successCount": 180,
  "failedCount": 60,
  "retryCount": 34
}
```

---

## 5.11 系统设置

### GET `/api/settings`

### PATCH `/api/settings`

配置示例：

```json
{
  "defaultProvider": "MINIMAX",
  "defaultImageModel": "image-01",
  "defaultVideoModel": "Hailuo-2.3-Fast",
  "defaultImageCount": 4,
  "defaultVideoCount": 2,
  "defaultDurationSec": 6,
  "defaultResolution": "1080p",
  "maxRetryCount": 2
}
```

---

# 6. Provider 层接口定义

建议 Cursor 按 TypeScript interface 实现。

```ts
export interface GenerateImagesInput {
  prompt: string;
  promptJson?: Record<string, any>;
  count: number;
  aspectRatio?: string;
  resolution?: string;
  referenceImageUrls?: string[];
  subjectReferenceUrls?: string[];
  seed?: number;
}

export interface GeneratedImageItem {
  providerAssetId?: string;
  url?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

export interface GenerateImagesResult {
  success: boolean;
  items: GeneratedImageItem[];
  raw?: any;
}

export interface GenerateVideoFromImageInput {
  prompt: string;
  inputImageUrl: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  subjectReferenceUrls?: string[];
}

export interface GenerateVideoTaskResult {
  success: boolean;
  taskId: string;
  raw?: any;
}

export interface ProviderTaskStatusResult {
  success: boolean;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  providerFileId?: string;
  outputUrl?: string;
  errorMessage?: string;
  raw?: any;
}

export interface DownloadAssetResult {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
}

export interface AiProvider {
  name: string;
  generateImages(input: GenerateImagesInput): Promise<GenerateImagesResult>;
  generateVideoFromImage(input: GenerateVideoFromImageInput): Promise<GenerateVideoTaskResult>;
  getTask(taskId: string): Promise<ProviderTaskStatusResult>;
  downloadAsset(input: { fileId?: string; url?: string }): Promise<DownloadAssetResult>;
}
```

---

# 7. Worker 任务设计

建议使用 BullMQ。

## 7.1 队列类型

* `image_generation_queue`
* `video_generation_queue`
* `task_polling_queue`
* `asset_download_queue`

## 7.2 任务执行逻辑

### ImageGenerationJob

1. 读取 generation_job
2. 拼 prompt
3. 调用 provider.generateImages
4. 下载图片
5. 上传对象存储
6. 创建 asset
7. 更新 job 成功
8. 记录 cost

### VideoGenerationJob

1. 读取输入首帧
2. 拼视频 prompt
3. 调用 provider.generateVideoFromImage
4. 保存 providerTaskId
5. 将轮询任务加入 polling queue

### PollingJob

1. 根据 providerTaskId 查状态
2. 若成功，进入 download queue
3. 若失败，写失败原因
4. 若仍运行，延迟重试轮询

### AssetDownloadJob

1. 下载远程文件
2. 上传对象存储
3. 创建 asset
4. 回写 outputAssetId
5. 标记 job 成功

---

# 8. 页面原型说明

以下不是视觉稿，而是给 Cursor 的页面结构说明。

---

## 8.1 登录页

### 目标

完成登录。

### 页面区块

1. Logo / 系统名称
2. 邮箱输入框
3. 密码输入框
4. 登录按钮
5. 错误提示区

### 交互

* 登录成功进入首页
* 登录失败显示错误信息

---

## 8.2 首页 / 控制台

### 目标

让用户快速看到系统总体情况。

### 页面区块

1. 顶部导航栏
2. 今日生成数卡片
3. 今日成功率卡片
4. 今日成本卡片
5. 最近任务列表
6. 最近待审核资产
7. 快速入口按钮

### 快速入口

* 新建角色模板
* 新建穿搭任务
* 查看资产库
* 查看成本统计

---

## 8.3 角色模板列表页

### 页面区块

1. 页面标题
2. 搜索框
3. 新建模板按钮
4. 模板卡片 / 表格
5. 分页

### 模板卡片内容

* 模板名称
* 参考图缩略图
* 默认镜头
* 默认动作
* 创建时间
* 操作按钮：查看 / 编辑 / 删除

---

## 8.4 角色模板详情页

### 页面区块

1. 基础信息
2. 参考图展示
3. 默认参数
4. 最近关联任务
5. 编辑按钮

---

## 8.5 新建穿搭任务页

### 页面布局

建议两栏布局。

### 左侧：表单区

1. 基础信息
2. 角色模板选择
3. 穿搭描述
4. 场景与镜头
5. 模型参数
6. 提交按钮

### 右侧：预览与说明区

1. Prompt 预览
2. 默认成本预估
3. 默认动作模板说明
4. 生成策略提示

### 提交后

* 先创建 outfit
* 再发起图片生成任务
* 跳转到任务详情页

---

## 8.6 穿搭任务详情页

### 目标

作为整条业务链路的主工作台。

### 页面区块

1. 任务基础信息
2. 首帧候选图片区
3. 首帧操作区
4. 视频任务区
5. 审核记录区
6. 成本统计区
7. Job 时间线区

### 首帧图片区

每张图卡片显示：

* 缩略图
* 模型
* seed
* 成本
* 状态
* 按钮：选为首帧 / 废弃 / 查看详情 / 下载

### 视频区

每个视频卡片显示：

* 视频预览
* 模型
* 时长
* 成本
* 状态
* 按钮：重试 / 审核 / 下载

---

## 8.7 资产库页

### 页面区块

1. 筛选栏
2. 资产网格
3. 资产详情抽屉

### 筛选条件

* 图片 / 视频
* Provider
* 审核状态
* 日期范围
* 所属任务

### 详情抽屉

显示：

* 大图 / 视频
* 来源 outfit
* 来源 job
* prompt
* seed
* 成本
* 下载链接
* 审核记录

---

## 8.8 审核页

### 页面区块

1. 待审核列表
2. 资产预览
3. 审核操作区
4. 审核备注区

### 操作

* 通过
* 驳回
* 归档

---

## 8.9 成本统计页

### 页面区块

1. 时间范围筛选
2. 总成本卡片
3. 成功率卡片
4. 失败率卡片
5. 按 Provider 统计图
6. 按模型统计图
7. 最近异常任务表

---

## 8.10 系统设置页

### 页面区块

1. Provider 配置
2. 对象存储配置
3. 默认模型配置
4. 默认参数配置
5. 重试配置
6. 保存按钮

---

# 9. Cursor 实现顺序建议

请你按以下顺序实现，不要乱序：

## 第一步：初始化项目

做什么：初始化 Next.js + Antd + Tailwind + Prisma + PostgreSQL + Redis + BullMQ
怎么做：先搭基础框架、环境变量、数据库连接、UI 布局
为什么：先把地基搭好，避免后期返工
输出物：可运行项目骨架
验收：本地可启动，数据库可连通，登录页可打开

## 第二步：用户与认证

做什么：实现登录与基础角色权限
怎么做：建 User 表，接入 NextAuth 或自定义简单认证
为什么：后续所有操作都要有用户身份
输出物：登录流程
验收：可登录、可获取当前用户信息

## 第三步：角色模板模块

做什么：实现模板 CRUD
怎么做：建表、建 API、做列表页和详情页
为什么：角色模板是首帧稳定性的基础
输出物：模板管理页面
验收：能创建、编辑、查看模板

## 第四步：穿搭任务模块

做什么：实现 outfit CRUD 和任务详情页
怎么做：建 Outfit 表、创建页面、详情页面
为什么：后续所有生成围绕 outfit 展开
输出物：任务管理模块
验收：可创建任务并查看详情

## 第五步：MiniMax Provider

做什么：接入图片生成和视频生成
怎么做：封装 Provider 接口，完成图片、视频、查询、下载
为什么：先跑通最小闭环
输出物：MiniMax provider 模块
验收：能成功生成首帧图和视频

## 第六步：Worker 与队列

做什么：实现异步任务消费
怎么做：BullMQ + Node Worker
为什么：视频任务不能同步阻塞
输出物：Worker 服务
验收：图片和视频任务都能异步执行并回写状态

## 第七步：资产入库与存储

做什么：上传对象存储并建 Asset 表
怎么做：下载厂商文件，再上传 S3/OSS/R2
为什么：不能依赖临时 URL
输出物：资产库
验收：生成结果都能在资产库查看和下载

## 第八步：审核与成本统计

做什么：加 Review 和 Cost 模块
怎么做：建表、建 API、做页面
为什么：让系统具备生产属性
输出物：审核页和统计页
验收：可审核、可看成本汇总

## 第九步：Runway Provider 预留位

做什么：完成 Provider 扩展接口与占位实现
怎么做：接口对齐，不一定立即打通
为什么：保证系统可扩展
输出物：Runway provider skeleton
验收：代码结构支持第二厂商接入

---

# 10. Cursor 编码规范要求

1. 使用 TypeScript 严格模式。
2. 接口入参全部用 Zod 校验。
3. API 响应统一格式。
4. 业务异常统一封装。
5. 页面和服务层分离。
6. Provider 和业务层分离。
7. Prompt Builder 单独成模块。
8. 所有异步任务必须能重试。
9. 所有关键模块要有 README。
10. `.env.example` 必须完整。

---

# 11. 统一 API 响应格式

```ts
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};
```

示例：

```json
{
  "success": true,
  "data": {
    "id": "outfit_001"
  }
}
```

错误示例：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "title is required"
  }
}
```

---

# 12. 环境变量建议

```env
DATABASE_URL=
REDIS_URL=

NEXTAUTH_SECRET=
NEXTAUTH_URL=

STORAGE_PROVIDER=s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

MINIMAX_API_KEY=
RUNWAY_API_KEY=
OPENAI_API_KEY=

DEFAULT_PROVIDER=MINIMAX
DEFAULT_IMAGE_MODEL=image-01
DEFAULT_VIDEO_MODEL=Hailuo-2.3-Fast
```

---

# 13. 交付物要求

最终你要交付给我：

1. 可运行代码
2. Prisma schema
3. SQL migration
4. `.env.example`
5. README
6. Provider 设计说明
7. API 文档
8. 页面截图或说明
9. MVP 完成清单
10. 后续待办清单

---

# 14. 最终执行要求

请按以下顺序工作：

1. 先输出你对以上 PRD 的理解。
2. 再输出可行性分析。
3. 再输出可优化点。
4. 再输出你认定的最终技术方案。
5. 再输出分步实施计划。
6. 没有硬阻塞就直接开始编码。
7. 编码时优先完成 MVP 闭环，不要先做花哨扩展。

---