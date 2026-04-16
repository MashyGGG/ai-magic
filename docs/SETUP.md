# Cursor 执行文档：穿搭推荐视频生成系统

## 目标：先做稳定首帧，再做图生视频，兼顾成本、稳定性、可批量生产

### 0. 你的角色与任务

你是资深全栈工程师 + AI 应用工程师 + 架构师。
你需要基于本文件，先完成**可行性分析**，再完成**优化建议**，再输出**分步实施计划**，最后在计划合理的前提下开始实现系统。

本项目的核心业务场景是：
**穿搭推荐视频生成**。
要求人物稳定、服装细节清楚、动作轻量，不追求复杂编舞。主流程必须是：

**文生图 / 参考图生图，先生成稳定首帧 → 再做图生视频**。

不要把系统主流程偷换成“直接文生视频”。这个场景下，行业最佳实践通常就是先定首帧，再让首帧动起来，因为这样更容易保证人物脸、服装版型、材质和配色稳定。

---

## 1. 你必须先做的事

在开始写代码前，你必须先输出以下内容，并且逐项明确说明：

### 1.1 可行性分析

你要先判断这份需求是否可行，至少回答：

1. 这个需求是否可以落地。
2. 哪些部分是高可行。
3. 哪些部分存在风险或不确定性。
4. 哪些需求描述还不够完整，但即使不完整，你也要基于合理假设继续推进，不要停住不做。
5. 当前最适合的技术路线是什么。
6. 为什么不建议“直接文生视频做主流程”。

### 1.2 优化建议

你必须分析这份方案是否有可优化的地方，并逐条回答：

1. 可以优化什么。
2. 怎么优化。
3. 为什么要这样优化。
4. 优化后会带来什么收益。
5. 会不会增加复杂度、成本或维护负担。

### 1.3 输出计划

你输出的计划必须是**逐步、可执行、可验收**的。
计划里的每一步都必须包含以下字段：

* 这一步做什么
* 怎么做
* 为什么这么做
* 输出物是什么
* 验收标准是什么
* 风险点是什么
* 如果失败怎么兜底

如果你发现需求里有不合理的地方，你不能只指出问题，必须给出替代方案。

---

## 2. 业务目标

系统要实现一个可落地的 Web 应用，满足以下业务流程：

1. 输入一套穿搭需求，或者输入商品/服装描述。
2. 先生成多张候选首帧图。
3. 从候选图中选出最稳定、最适合做视频的一张或多张。
4. 基于首帧图生成短视频。
5. 视频动作以轻动作为主，例如：

   * 轻微转身
   * 抬手
   * 小幅走步
   * 轻摆
   * 回眸
   * 整理衣领
   * 提包
   * 裙摆自然晃动

不要把动作设计成复杂舞蹈或大幅度编舞，因为这会明显提高失败率，尤其会增加衣服变形、脸跑偏、肢体异常的概率。这个判断与用户上传场景是一致的。

---

## 3. 技术目标

系统主架构必须以以下栈为基础：

* Next.js
* Ant Design
* Tailwind CSS

在此基础上，你可以按工程落地需要增加其他必要组件，但必须说明为什么加、解决什么问题。

我建议你采用的工程化落地架构如下：

* 前端：Next.js App Router + TypeScript + Antd + Tailwind
* BFF / API：Next.js Route Handlers
* 数据库：PostgreSQL
* ORM：Prisma
* 队列：Redis + BullMQ
* 异步 Worker：Node.js Worker
* 对象存储：S3 / OSS / COS / Cloudflare R2 任选一种，要求可替换
* 认证：NextAuth 或 Clerk，优先简单可控方案
* 表单校验：Zod
* 状态管理：React Query + Zustand
* 日志与监控：Sentry + 基础业务日志表
* 部署：Vercel 部署前端，Worker 单独部署到容器或 Node 环境

### 为什么必须加 Worker 和队列

因为图生视频通常是异步任务，不适合只靠 Next.js 请求同步等待结果。
MiniMax 官方把视频生成设计成“创建任务 → 查询状态 → 获取文件”的异步流程；Runway 也是异步任务式接口，SDK 还提供 `waitForTaskOutput`，但本质上仍是任务轮询模型。([platform.minimaxi.com][1])

所以这个系统不能只做一个简单前端页面，而必须做成：

**Web 前台 + API 层 + 异步任务调度 + 结果回收 + 资产入库**

否则一到真实生产就会出现：

* 请求超时
* 结果丢失
* 任务不可追踪
* 无法批量生成
* 无法统计成本
* 无法失败重试

---

## 4. 模型选择结论

## 4.1 国内主生产方案（默认主链路）

### 图片模型

**MiniMax image-01**

### 视频模型

**MiniMax Hailuo 2.3-Fast**

### 为什么它应当作为默认主链路

MiniMax 官方文档明确支持：

* `image-01` 文生图与参考图生成
* `subject_reference` 保持人物主体一致性
* 视频侧支持首帧图生视频、首尾帧视频、主体参考
* 视频任务为异步接口，适合工程化任务队列
* 价格公开透明，便于做预算与成本控制。([platform.minimaxi.com][2])

MiniMax 当前公开按量价格里：

* `image-01` 为 **0.025 元/张**
* `MiniMax-Hailuo-2.3-Fast` 图生视频 768P 6s 为 **1.35 元/条**
* `MiniMax-Hailuo-2.3-Fast` 图生视频 1080P 6s 为 **2.31 元/条**
* `MiniMax-Hailuo-2.3` / `MiniMax-Hailuo-02` 1080P 6s 为 **3.50 元/条**。([platform.minimaxi.com][3])

### 适用策略

默认策略建议是：

* 候选首帧：`image-01`
* 低成本试跑视频：`Hailuo 2.3-Fast` 768P 6s
* 爆款或确认版视频：升级到 `Hailuo 2.3-Fast` 1080P 6s 或 `Hailuo 2.3`

### 原因

这样做能把“试错成本”和“最终成片质量”分层管理，不要一上来就全部跑高成本版本。

---

## 4.2 国内备用方案

### 备用链路

**即梦图片 4.x + 即梦视频 3.0 / 3.0 Pro**

火山引擎官方文档目录显示，即梦当前仍在维护：

* 图片生成 4.0 / 4.6
* 视频生成 3.0 / 3.0 Pro
* 视频 1080P 接口
  同时官方目录也标出旧版 `S2.0 Pro` 正在“陆续下线中”。因此如果要做国内备用适配器，应该围绕 3.0 / 3.0 Pro 与图片 4.x 设计，而不是围绕旧模型做主实现。([火山引擎][4])

### 为什么它只做备用，不做默认主链路

因为在我当前能直接核实到的官方资料里，即梦的产品线和接口维护状态是明确的，但价格细节不如 MiniMax 那样容易直接提取和对比；而你的需求又明确要求“考虑成本并使用最具性价比的模型组合”。所以工程上更稳妥的做法是：

* 主链路选**价格透明 + 异步流程明确**的 MiniMax
* 备用链路预留即梦 Provider 适配器
* 不把系统绑定死在单一厂商上。([火山引擎][5])

---

## 4.3 国际主生产方案

### 图片模型

**Runway `gen4_image` / `gen4_image_turbo`**

### 视频模型

**Runway `gen4_turbo`**

### 为什么这是国际主方案

Runway 官方当前公开：

* 图片生成支持 `gen4_image`、`gen4_image_turbo`
* 视频生成支持 `gen4_turbo`、`gen4.5`
* 任务是异步模式
* SDK 支持 `waitForTaskOutput`
* 输出 URL 是临时的，必须下载到自有存储
* 价格是 credits 模式，**1 credit = $0.01**
* `gen4_turbo` 为 **5 credits/秒**
* `gen4.5` 为 **12 credits/秒**
* `gen4_image` 为 **720p 5 credits / 1080p 8 credits**
* `gen4_image_turbo` 为 **2 credits/张**。([Runway API][6])

### 国际链路的推荐用法

建议这样分层：

* 草图首帧：`gen4_image_turbo`
* 正式首帧：`gen4_image`
* 默认视频：`gen4_turbo`
* 仅给高价值场景升级到：`gen4.5`

### 原因

`gen4.5` 更贵，不应该拿来做所有样片。
国际链路也应该先做低成本筛图和试跑，再给少数通过审核的内容升级高质量。

---

## 4.4 国际实验链路

### 可选图片模型

**OpenAI GPT Image 1.5**

OpenAI 官方价格页显示，`gpt-image-1.5` 当前仍可用，并且图像生成价格按 token 和输出计费；官方图像模型页也给出了按分辨率和质量的每图估算价格。([OpenAI开发者][7])

### 不建议作为长期主视频链路的原因

OpenAI 官方已经明确说明：
**Sora 2 与 Videos API 已被弃用，并将在 2026-09-24 下线。**
所以，如果要长期做生产系统，不要把 OpenAI 的视频接口当成主生产链路；最多把 OpenAI 保留为图片增强、提示词改写、首帧编辑增强等实验模块。([OpenAI开发者][8])

---

## 5. 成本策略

系统必须从第一天就考虑成本，而不是功能做完再补。

### 5.1 默认成本策略

每套穿搭默认生成：

* 候选首帧 4 张
* 入选首帧 1 张
* 候选视频 2 条
* 默认时长 4 到 6 秒
* 默认先跑低成本版本

### 5.2 MiniMax 成本估算

如果一套穿搭按：

* 4 张首帧图
* 2 条 768P 6s 视频

那么理论单次成本约为：

* 图片：4 × 0.025 = **0.10 元**
* 视频：2 × 1.35 = **2.70 元**
* 合计约 **2.80 元/套**

如果跑高质量 1080P 6s：

* 图片：仍约 **0.10 元**
* 视频：2 × 3.50 = **7.00 元**
* 合计约 **7.10 元/套**。([platform.minimaxi.com][3])

### 5.3 Runway 成本估算

如果一套穿搭按：

* 4 张 `gen4_image` 1080p 图片
* 2 条 5 秒 `gen4_turbo` 视频

那么理论成本约为：

* 图片：4 × 8 credits = 32 credits = **$0.32**
* 视频：2 × 5 秒 × 5 credits = 50 credits = **$0.50**
* 合计约 **$0.82/套**

如果视频升级到 `gen4.5`：

* 图片：**$0.32**
* 视频：2 × 5 × 12 credits = 120 credits = **$1.20**
* 合计约 **$1.52/套**。([Runway API][6])

### 5.4 必须做重试预算

真实业务里不能只按理论最低价估算。
你必须在系统里预留“失败重试预算”，默认至少按**理论成本 × 2**估算，因为常见失败包括：

* 首帧不稳
* 衣服变形
* 脸跑偏
* 手部异常
* 背景脏乱
* 动作不自然

这个“乘 2 预算”的建议是工程经验要求，不是平台官方定价规则。

---

## 6. 系统设计原则

### 6.1 主流程固定为“两阶段”

必须固定成：

**阶段 A：稳定首帧生成**
**阶段 B：首帧驱动视频生成**

不要做成一键直接文生视频主流程。

### 6.2 人物一致性优先级高于创意发散

穿搭视频更关注：

* 人脸稳定
* 发型稳定
* 身材比例稳定
* 服装版型稳定
* 材质与纹理稳定

所以系统默认策略应该是：

* 参考图
* 角色模板
* 固定镜头模板
* 固定动作模板
* 固定 seed 或记录 seed 以便复现

MiniMax 图片接口支持 `subject_reference`，且图片接口支持 `seed`；Runway 的图片与视频接口支持参考图输入，适合一致性工作流。([platform.minimaxi.com][2])

### 6.3 动作要轻，不要大开大合

默认动作模板只允许：

* 轻摆
* 半步前行
* 缓慢转身
* 轻抬手
* 看镜头
* 整理领口
* 展示包或鞋
* 裙摆轻晃

这是为了降低衣服漂移与肢体错误，符合你的业务场景。

### 6.4 视频时长要短

默认视频长度建议优先控制在 **4–6 秒**。
MiniMax 当前公开价格档位本身就集中在 6 秒与 10 秒，Runway 官方示例和价格也是按秒计费，时长增加会线性推高成本与失败损耗。([platform.minimaxi.com][3])

### 6.5 结果必须下载回自有存储

不能依赖厂商临时链接做长期资产保存。
Runway 官方说明输出 URL 是临时的，通常 **24–48 小时**内过期；MiniMax 图片 URL 也有 **24 小时**有效期，视频则需要拿到 `file_id` 后再下载。([Runway API][9])

---

## 7. 你要实现的核心功能

### 7.1 角色模板管理

支持创建角色模板，包含：

* 名称
* 性别风格
* 脸型描述
* 发型描述
* 肤色描述
* 身材比例描述
* 参考图
* 默认镜头模板
* 默认动作模板

### 7.2 穿搭任务创建

支持创建一条穿搭生成任务，包含：

* 角色模板
* 上装描述
* 下装描述
* 鞋包配饰描述
* 面料/纹理描述
* 色系
* 背景
* 场景
* 镜头
* 动作
* 输出比例
* 输出分辨率
* 视频时长
* Provider 选择
* 图片模型选择
* 视频模型选择

### 7.3 首帧生成

支持：

* 文生图
* 参考图生图
* 同时生成多张候选图
* 记录 prompt、seed、模型、成本、结果 URL、本地存储地址

### 7.4 首帧筛选

支持：

* 人工选图
* 自动规则打分（可先做简单版）
* 标记“可用于视频”或“废弃”

### 7.5 图生视频

支持：

* 选择首帧图发起视频生成
* 轮询任务状态
* 成功后自动下载视频
* 自动记录成本、耗时、状态、失败原因

### 7.6 资产管理

支持查看：

* 图片
* 视频
* 原始 prompt
* 生成时间
* 生成模型
* 分辨率
* 时长
* 任务状态
* 成本
* 下载地址
* 归档状态

### 7.7 审核流

支持基础审核状态：

* draft
* generated
* reviewing
* approved
* rejected
* archived

### 7.8 成本面板

支持查看：

* 单任务成本
* 单套穿搭成本
* 单日成本
* 单模型成本
* 重试成本
* 成功率
* 失败率

---

## 8. 建议的数据模型

你要优先设计好下面这些表，不要等后期再补。

### 8.1 users

用户表

### 8.2 character_templates

角色模板表

核心字段建议：

* id
* name
* description
* gender_style
* face_desc
* hair_desc
* skin_desc
* body_desc
* default_scene
* default_camera
* default_motion
* reference_image_asset_id
* created_by
* created_at
* updated_at

### 8.3 outfits

穿搭任务表

核心字段建议：

* id
* title
* character_template_id
* top_desc
* bottom_desc
* shoes_desc
* bag_desc
* accessories_desc
* material_desc
* color_desc
* background_desc
* scene_desc
* camera_template
* motion_template
* aspect_ratio
* duration_sec
* provider_preference
* status
* created_at
* updated_at

### 8.4 generation_jobs

生成任务表

核心字段建议：

* id
* outfit_id
* stage （image / video）
* provider
* model
* input_asset_id
* provider_task_id
* status
* prompt_text
* prompt_json
* seed
* duration_sec
* resolution
* error_message
* started_at
* finished_at
* created_at

### 8.5 assets

资产表

核心字段建议：

* id
* type （image / video）
* mime_type
* width
* height
* duration_ms
* provider
* provider_file_id
* provider_url
* storage_key
* storage_bucket
* sha256
* metadata_json
* created_at

### 8.6 cost_ledgers

成本台账表

核心字段建议：

* id
* generation_job_id
* provider
* model
* currency
* amount
* billing_unit
* raw_billing_json
* created_at

### 8.7 review_records

审核记录表

核心字段建议：

* id
* outfit_id
* asset_id
* reviewer_id
* status
* comment
* created_at

---

## 9. 目录结构建议

建议你直接做成 monorepo 或单仓多应用结构：

* `apps/web`
* `apps/worker`
* `packages/shared`
* `packages/prompts`
* `packages/providers`
* `packages/db`

如果不做 monorepo，至少也要把 provider、prompt、db schema 独立为清晰模块。

### 推荐职责拆分

#### `apps/web`

负责：

* 页面
* 管理台
* 任务创建
* 查询任务
* 审核
* 成本面板

#### `apps/worker`

负责：

* 消费队列
* 发起图片生成
* 发起视频生成
* 轮询厂商任务状态
* 下载结果文件
* 回写数据库
* 失败重试

#### `packages/providers`

负责：

* Provider 抽象接口
* MiniMax 实现
* Runway 实现
* Jiemeng 占位实现
* OpenAI Image 占位实现

#### `packages/prompts`

负责：

* Prompt 模板
* 镜头模板
* 动作模板
* 场景模板
* 穿搭模板
* 提示词拼装器

---

## 10. Provider 抽象必须这样设计

你不能把业务逻辑直接写死在某一个厂商 SDK 上。
必须设计 Provider 抽象层，例如：

### 图片接口

* `generateImages(input): Promise<ImageGenerationResult>`

### 视频接口

* `generateVideoFromImage(input): Promise<VideoTaskResult>`

### 查询任务

* `getTask(taskId): Promise<TaskStatusResult>`

### 下载资源

* `downloadAsset(fileIdOrUrl): Promise<Buffer | Stream>`

### 成本估算

* `estimateCost(input): CostEstimate`

### 模型能力声明

* `getCapabilities(): ProviderCapabilities`

`ProviderCapabilities` 至少要包含：

* supportsTextToImage
* supportsImageToImage
* supportsImageToVideo
* supportsStartEndFrame
* supportsSubjectReference
* supportsSeed
* supports1080p
* supportsPromptOptimizer
* supportsAsyncTask
* supportsUrlInput
* supportsBase64Input

这样未来切换供应商时，不需要重写业务层。

---

## 11. 任务流设计

### 11.1 首帧生成任务流

1. 用户创建穿搭任务
2. 系统根据角色模板 + 穿搭描述 + 镜头模板拼出首帧 prompt
3. 提交图片生成任务
4. 保存任务记录
5. 保存生成结果
6. 回显候选首帧
7. 用户选择一张作为视频首帧

### 11.2 图生视频任务流

1. 用户选定首帧图
2. 系统基于动作模板 + 镜头模板拼视频 prompt
3. 提交图生视频任务
4. Worker 轮询状态
5. 成功后下载视频
6. 上传到自有对象存储
7. 写回数据库
8. 标记可审核

### 11.3 重试策略

必须实现：

* 最大重试次数
* 指数退避
* 仅对可重试错误自动重试
* 人工重新触发
* 重试原因记录

Runway 官方建议任务轮询至少 5 秒以上，并加入 jitter 与指数退避；MiniMax 视频任务本身是异步查询式流程。([Runway API][10])

---

## 12. Prompt 设计要求

Prompt 系统不能靠纯字符串硬拼，必须模板化。

### 12.1 首帧 Prompt 模板

至少拆成：

* 角色描述
* 服装描述
* 材质与纹理描述
* 镜头描述
* 光线描述
* 背景描述
* 构图描述
* 质量约束
* 稳定性约束

### 12.2 视频 Prompt 模板

至少拆成：

* 起始状态描述
* 轻动作描述
* 镜头运动描述
* 服装稳定性约束
* 人脸稳定性约束
* 背景稳定性约束
* 时长与节奏控制

### 12.3 建议的首帧 Prompt 方向

要求生成：

* 全身或半身清晰
* 服装版型清楚
* 面料真实
* 配色准确
* 五官稳定
* 商业摄影感
* 电商 / 穿搭展示导向
* 不要过度夸张动作

### 12.4 建议的视频 Prompt 方向

要求生成：

* 轻微自然动作
* 服装细节稳定
* 人物脸不漂移
* 手部自然
* 镜头缓慢移动
* 不要复杂舞蹈
* 不要大幅跑跳

---

## 13. 默认模板策略

### 13.1 镜头模板

先只做几个最实用的：

* 正面全身
* 45° 全身
* 半身近景
* 侧身走步
* 细节特写

### 13.2 动作模板

先只做几个轻动作：

* 站立轻摆
* 向前一步
* 缓慢转身
* 抬手整理衣领
* 提包转头
* 裙摆轻晃
* 微笑看镜头

### 13.3 场景模板

先做少而稳：

* 简洁纯色背景
* 极简摄影棚
* 商场通道
* 咖啡店外立面
* 街拍风墙面
* 轻奢店内

不要一开始就做过多花哨场景，不然会让系统复杂度暴增。

---

## 14. UI 页面建议

至少实现这些页面：

### 14.1 登录页

### 14.2 角色模板管理页

### 14.3 穿搭任务创建页

### 14.4 首帧候选页

### 14.5 视频任务页

### 14.6 资产库页

### 14.7 审核页

### 14.8 成本与统计页

### 14.9 系统设置页

---

## 15. 后端 API 建议

至少实现这些 API：

* `POST /api/character-templates`
* `GET /api/character-templates`
* `POST /api/outfits`
* `GET /api/outfits`
* `GET /api/outfits/:id`
* `POST /api/generations/image`
* `POST /api/generations/video`
* `POST /api/jobs/:id/retry`
* `GET /api/jobs/:id`
* `GET /api/assets`
* `POST /api/reviews`
* `GET /api/costs/summary`

---

## 16. MiniMax 接入要求

MiniMax 要作为第一个真正实现的 Provider。

### 你必须实现的能力

* 图片生成
* 人物主体参考
* 视频图生视频
* 视频任务轮询
* 文件下载
* 成本记录

MiniMax 图片官方文档显示：

* `image-01` 支持文本或参考图片生成
* 支持 `subject_reference`
* 支持 `seed`
* 返回图片 URL 时有效期为 24 小时。([platform.minimaxi.com][11])

MiniMax 视频官方文档显示：

* 支持文本、图片（首帧、尾帧、主体参考）生成视频
* 视频生成采用异步模式
* 创建任务成功后返回 `task_id`
* 查询成功后返回 `file_id`
* 再通过文件管理接口获取下载结果。([platform.minimaxi.com][1])

### 实现要求

你必须把：

* API 调用
* 轮询
* 下载
* 存储
* 成本写入
* 错误处理

封装成完整 Provider，不允许散落在页面代码里。

---

## 17. Runway 接入要求

Runway 要作为第二个真正实现的 Provider。

### 你必须考虑的点

* API 版本头固定
* 任务异步轮询
* 输出 URL 临时性
* 成本按 credits 换算
* 保留 task id 以便追踪

Runway 官方 API 文档要求 `X-Runway-Version` 使用固定版本值；当前文档示例给出的版本值是 **2024-11-06**。([Runway API][12])

Runway 官方 SDK 文档说明：

* 任务是异步的
* 可以用 `tasks.retrieve` 轮询
* 推荐至少 5 秒轮询并加入抖动与指数退避
* SDK 提供 `waitForTaskOutput`
* 输出链接是临时的，要下载到自有存储。([Runway API][10])

---

## 18. OpenAI 接入要求

OpenAI 只做实验性 Provider，不作为默认视频生产链路。

### 可以做什么

* 用 GPT Image 1.5 做首帧增强
* 做 prompt 改写
* 做图片编辑增强
* 做结果分析与打分辅助

### 不建议做什么

* 不要把 Sora 2 当长期主链路
* 不要把主流程绑定到即将下线的 Videos API

因为 OpenAI 官方已经明确公告：
**Sora 2 和 Videos API 将于 2026-09-24 下线。** ([OpenAI开发者][8])

---

## 19. 审核与质量控制要求

必须加入基础质检，不然系统虽然能生成，但很难生产可用内容。

### 图片质检维度

* 是否脸部清晰
* 是否服装主体完整
* 是否版型明显变形
* 是否纹理脏乱
* 是否构图可用
* 是否适合作为视频首帧

### 视频质检维度

* 是否脸漂移
* 是否服装漂移
* 是否手部异常
* 是否动作过大
* 是否背景突变
* 是否时长合理
* 是否达到可投放标准

初版可以先做：

* 人工审核
* 简单规则打分

后续可加：

* AI 自动打分
* 多指标质量评分器

---

## 20. 必须记录的可追踪信息

每一次生成都要记录：

* provider
* model
* prompt
* seed
* 输入图片
* 输出图片 / 视频
* 任务 id
* 文件 id
* 耗时
* 成本
* 状态
* 错误信息
* 重试次数
* 创建人
* 创建时间

否则后续没法：

* 复盘
* 找爆款 prompt
* 统计失败原因
* 做成本分析
* 做稳定性优化

---

## 21. 第一阶段 MVP 范围

MVP 不要做太重，但必须可用。

### MVP 必做

1. 登录
2. 角色模板管理
3. 穿搭任务创建
4. MiniMax 首帧生成
5. MiniMax 图生视频
6. 资产入库
7. 审核状态
8. 成本记录
9. 任务重试
10. 基础统计页

### MVP 可暂缓

1. 多租户
2. 复杂权限系统
3. 自动 AI 打分
4. 即梦正式接入
5. OpenAI 图片增强
6. 多语言
7. 成片自动剪辑

---

## 22. 第二阶段增强范围

1. Runway Provider
2. 即梦 Provider
3. AI 质检打分
4. 提示词模板市场
5. 批量任务导入
6. 商品库联动
7. 爆款模板复用
8. 成片拼接
9. 批量导出
10. A/B 测试与成功率分析

---

## 23. 你给我的输出格式必须是这样

你在正式开始写代码前，先按这个结构输出：

### A. 需求理解

用你自己的话复述需求，不要照抄。

### B. 可行性结论

明确说：

* 可行 / 部分可行 / 有风险但可落地
* 风险在哪里
* 你准备怎么规避

### C. 优化建议

逐条列出：

* 优化点
* 怎么优化
* 为什么这样优化
* 收益
* 代价

### D. 最终技术方案

输出你认定的最终架构与模型组合。

### E. 分步实施计划

每一步都必须写：

1. 做什么
2. 怎么做
3. 为什么这么做
4. 输出物
5. 验收标准
6. 风险与兜底

### F. 开始实现

如果方案没有硬阻塞，就直接开始实现，不要停在“建议阶段”。

---

## 24. 你在实现时必须遵守的工程规则

1. 使用 TypeScript。
2. 不允许把大段业务逻辑写在页面组件里。
3. Provider 必须抽象。
4. Prompt 拼装必须模块化。
5. 所有外部模型调用必须有统一错误处理。
6. 所有异步任务必须可追踪。
7. 所有文件结果必须回存自有对象存储。
8. 所有成本必须落库。
9. 所有页面必须考虑基础可用性与空状态。
10. 所有关键流程必须写 README 与 `.env.example`。
11. 所有关键模块都要带最基本的类型与注释。
12. 优先保证“先跑通最小闭环”，再做扩展。

---

## 25. 你对“可优化点”的标准判断

你必须重点检查这些地方是否应优化：

### 25.1 架构是否过轻

如果只用 Next.js 页面 + API，而没有队列/Worker，这是不合理的，需要优化。

### 25.2 模型是否选错

如果把高价模型当默认试错模型，这是不合理的，需要优化。

### 25.3 是否缺少成本控制

如果没有预算、统计、重试成本记录，这是不合理的，需要优化。

### 25.4 是否缺少资产沉淀

如果结果只停留在厂商临时 URL，这是不合理的，需要优化。

### 25.5 是否缺少复现能力

如果不记录 prompt / seed / model / 输入输出，这是不合理的，需要优化。

### 25.6 是否缺少失败兜底

如果失败后只能人工重来，这是不合理的，需要优化。

---

## 26. 你可以直接采用的默认模型策略

### 默认国内策略

* 首帧图：MiniMax `image-01`
* 草稿视频：MiniMax `Hailuo 2.3-Fast` 768P 6s
* 正式视频：MiniMax `Hailuo 2.3-Fast` 1080P 6s 或 `Hailuo 2.3`

### 默认国际策略

* 草稿首帧：Runway `gen4_image_turbo`
* 正式首帧：Runway `gen4_image`
* 草稿视频：Runway `gen4_turbo`
* 高质量升级：Runway `gen4.5`

### 实验策略

* 首帧增强：OpenAI `gpt-image-1.5`
* 不将 `sora-2` 用作长期主链路。([platform.minimaxi.com][3])

---

## 27. 最终产品目标

最终你要实现的不是一个“玩具 demo”，而是一个能用于真实业务试跑的系统。
这个系统要满足：

* 可创建任务
* 可批量试错
* 可控制成本
* 可追踪每次生成
* 可切换模型供应商
* 可沉淀资产
* 可逐步扩展到批量化生产

---

## 28. 一句最重要的原则

**这个项目的核心不是“让 AI 随便生成视频”，而是“让穿搭内容以尽可能低的成本，稳定地产出可用首帧和可用短视频”。**

---

如果你想更省事，下面这段也可以单独复制给 Cursor 作为启动指令：

---

**启动指令：**

请严格按以下顺序执行，不要跳步：

1. 先完整理解我给你的《穿搭推荐视频生成系统》文档。
2. 先输出“需求理解”。
3. 再输出“可行性分析”。
4. 再输出“优化建议”，每条都要写清楚优化什么、怎么优化、为什么优化、收益和代价。
5. 再输出“最终技术方案”。
6. 再输出“分步实施计划”，且每一步必须包含：做什么、怎么做、为什么这么做、输出物、验收标准、风险与兜底。
7. 如果没有硬阻塞，按计划直接开始实现。
8. 实现时以 Next.js + Antd + Tailwind CSS 为主架构，并补齐 PostgreSQL、Prisma、Redis、BullMQ、Worker、对象存储、Provider 抽象层、成本统计、任务追踪。
9. 主流程必须是“稳定首帧生成 → 图生视频”，不要改成直接文生视频主流程。
10. 默认先实现 MiniMax Provider，再预留 Runway / 即梦 / OpenAI Image Provider 扩展位。

---

你要是愿意，我下一条可以继续直接给你一版**“Cursor 更容易执行的 PRD + 数据库表结构 + API 定义 + 页面原型说明”**。

[1]: https://platform.minimaxi.com/docs/api-reference/video-generation-intro?utm_source=chatgpt.com "视频生成（Video Generation） - MiniMax 开放平台文档中心"
[2]: https://platform.minimaxi.com/docs/guides/image-generation?utm_source=chatgpt.com "图片生成 - MiniMax 开放平台文档中心"
[3]: https://platform.minimaxi.com/docs/guides/pricing-paygo?utm_source=chatgpt.com "按量计费 - MiniMax 开放平台文档中心"
[4]: https://www.volcengine.com/docs/85621/0?utm_source=chatgpt.com "即梦AI-火山引擎"
[5]: https://www.volcengine.com/docs/85621/1544714 "即梦AI-图像生成计费说明--即梦AI-火山引擎"
[6]: https://docs.dev.runwayml.com/guides/pricing/ "API Pricing & Costs | Runway API"
[7]: https://developers.openai.com/api/docs/pricing "Pricing | OpenAI API"
[8]: https://developers.openai.com/api/docs/guides/video-generation?utm_source=chatgpt.com "Video generation with Sora | OpenAI API"
[9]: https://docs.dev.runwayml.com/assets/outputs/ "API Output Formats | Runway API"
[10]: https://docs.dev.runwayml.com/api-details/sdks/ "Software Development Kits | Runway API"
[11]: https://platform.minimaxi.com/docs/api-reference/image-generation-intro?utm_source=chatgpt.com "图像生成（Image Generation） - MiniMax 开放平台文档中心"
[12]: https://docs.dev.runwayml.com/api/?utm_source=chatgpt.com "API Reference | Runway API"
