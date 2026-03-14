# Chat Bot — 项目文档

> 基于豆包 Seed 大模型的智能聊天机器人，深度集成钉钉平台，具备双 Agent 智能路由、长期记忆归档、工具调用、开放接口等核心能力。

---

## 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [核心模块详解](#核心模块详解)
  - [应用入口](#应用入口)
  - [机器人主逻辑](#机器人主逻辑)
  - [钉钉集成服务](#钉钉集成服务)
  - [豆包 AI 服务](#豆包-ai-服务)
  - [双 Agent 路由机制](#双-agent-路由机制)
  - [智能记忆系统](#智能记忆系统)
  - [数据缓存层](#数据缓存层)
  - [工具调用系统](#工具调用系统)
  - [开放接口服务](#开放接口服务)
- [数据库设计](#数据库设计)
- [API 接口文档](#api-接口文档)
- [环境变量配置](#环境变量配置)
- [快速开始](#快速开始)
- [部署指南](#部署指南)
- [数据流程说明](#数据流程说明)
- [安全说明](#安全说明)
- [常见问题](#常见问题)

---

## 项目概述

Chat Bot 是一款面向企业内部使用的 AI 智能聊天机器人，通过钉钉 Stream 长连接接收消息，结合豆包 Seed 大模型进行智能回复。项目采用 TypeScript 全栈开发，具备以下核心特性：

| 特性                  | 说明                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| **双 Agent 智能路由** | 中枢神经 Agent 快速判断 + 大脑 Agent 深度处理，兼顾响应速度与回复质量 |
| **长期记忆系统**      | 自动生成日记忆和月记忆，实现 AI 对用户的长期认知积累                  |
| **工具调用能力**      | 集成百度搜索、历史记录检索、延迟发起会话三大工具                      |
| **内存缓存架构**      | 聊天记录和记忆均在内存缓存，AI 调用无需实时查库                       |
| **开放 HTTP 接口**    | 支持外部系统通过认证接口主动向管理员发送钉钉消息                      |
| **权限精准管控**      | 仅响应管理员私聊，自动过滤群消息、非管理员及非文本消息                |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      外部触发层                           │
│   钉钉平台（Stream 长连接）      外部系统（HTTP POST）     │
└────────────────┬───────────────────────┬────────────────┘
                 │                       │
┌────────────────▼───────────────────────▼────────────────┐
│                      服务接入层                           │
│    DingTalk Service（消息监听）   Express Router（路由）  │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                    机器人主逻辑层（robot.ts）              │
│                                                          │
│   心跳机制（2s轮询） → 消息路由判断                        │
│        ├── 消息 > 5条 或 内容 > 100字                     │
│        │         └──→ 大脑 Agent（复杂处理）               │
│        └── 其他情况                                       │
│                  └──→ 中枢神经 Agent（快速处理）           │
│                            ├── action: reply → 直接回复   │
│                            ├── action: brain → 转大脑     │
│                            └── action: ignore → 等待      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                  豆包 AI 服务层（doubao）                  │
│                                                          │
│   chat() 核心调用 → 工具调用循环（最多5轮）               │
│        ├── get_baidu_search    百度实时搜索                │
│        ├── search_chat_records 历史记录检索                │
│        └── speak_to_user       延迟发起会话                │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                      数据层                               │
│                                                          │
│   内存缓存（Store）          MySQL 数据库                  │
│   ├── RecordStore            ├── record 表（聊天记录）     │
│   └── MemoryStore            └── memory 表（记忆归档）     │
└─────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 类别            | 技术            | 版本                        | 用途                     |
| --------------- | --------------- | --------------------------- | ------------------------ |
| **运行时**      | Node.js         | ≥ 20.0.0                    | 服务端运行环境           |
| **语言**        | TypeScript      | ^5.7.2                      | 类型安全的开发语言       |
| **Web 框架**    | Express         | ^5.2.1                      | HTTP 服务 / 开放接口     |
| **AI 模型**     | 豆包 Seed       | doubao-seed-2-0-lite-260215 | 核心 AI 对话能力         |
| **消息平台**    | dingtalk-stream | ^2.1.4                      | 钉钉机器人 Stream 长连接 |
| **数据库**      | mysql2          | ^3.16.2                     | MySQL 连接池驱动         |
| **HTTP 客户端** | axios           | ^1.13.4                     | 外部 API 请求            |
| **定时任务**    | node-cron       | ^4.2.1                      | 记忆归档定时调度         |
| **日期处理**    | dayjs           | ^1.11.19                    | 日期格式化与计算         |
| **开发工具**    | tsx             | ^4.19.2                     | TypeScript 热重载运行    |
| **构建**        | tsc + tsc-alias | ^5.7.2 / ^1.8.11            | 编译 + 路径别名解析      |
| **代码压缩**    | terser          | ^5.46.0                     | 生产构建产物压缩         |

---

## 项目结构

```
chat-bot/
├── src/
│   ├── api/                        # 外部 API 请求封装
│   │   ├── baiduApi.ts             # 百度千帆搜索 API
│   │   └── request.ts              # axios 实例封装（get / post）
│   │
│   ├── db/                         # 数据库操作层
│   │   ├── mysql.ts                # MySQL 连接池初始化
│   │   ├── record.ts               # 聊天记录 CRUD 及表创建
│   │   └── memory.ts               # 记忆 CRUD 及表创建
│   │
│   ├── routes/                     # HTTP 路由层
│   │   ├── middleware/
│   │   │   └── steamAuth.ts        # 开放接口认证中间件
│   │   └── open.ts                 # 开放接口路由
│   │
│   ├── services/                   # 业务服务层
│   │   ├── robot.ts                # 机器人主逻辑（消息路由与调度）
│   │   ├── dingtalk/
│   │   │   ├── index.ts            # 钉钉消息监听（Stream 接收 + 过滤）
│   │   │   └── send.ts             # 钉钉消息主动发送（含 Token 缓存）
│   │   ├── doubao/
│   │   │   ├── index.ts            # AI 对话核心（chat 函数 + 工具调用循环）
│   │   │   ├── agents/
│   │   │   │   ├── base.ts         # Agent 公共函数封装（格式化、JSON解析等）
│   │   │   │   ├── brain.ts        # 大脑 Agent（携带记忆+工具的复杂处理）
│   │   │   │   ├── neural.ts       # 中枢神经 Agent（快速判断，无记忆工具）
│   │   │   │   ├── proactive.ts    # 主动联系 Agent（智能决策是否发消息）
│   │   │   │   └── memory.ts       # 记忆生成 Agent（日记忆 / 月记忆）
│   │   │   ├── prompts/
│   │   │   │   ├── common.ts       # 公共提示词（角色设定、限制事项）
│   │   │   │   ├── brain.ts        # 大脑 Agent 系统提示词
│   │   │   │   ├── neural.ts       # 中枢神经 Agent 系统提示词
│   │   │   │   ├── proactive.ts    # 主动联系 Agent 系统提示词
│   │   │   │   └── memory.ts       # 记忆生成提示词
│   │   │   └── tools/
│   │   │       └── index.ts        # 工具函数实现（搜索、记录查询、发起会话）
│   │   └── memory/
│   │       └── index.ts            # 记忆服务（定时任务 + 记忆归档流程）
│   │
│   ├── stores/                     # 内存缓存层（模块级单例）
│   │   ├── record.ts               # 聊天记录内存 Map + 查询方法
│   │   └── memory.ts               # 记忆内存 Map + 操作方法
│   │
│   ├── types/                      # TypeScript 全局类型定义
│   │   ├── common.d.ts             # Message / Tool 接口
│   │   └── baiduApi.d.ts           # 百度 API 响应类型
│   │
│   ├── utils/                      # 工具函数
│   │   ├── delay.ts                # 延迟函数
│   │   ├── file.ts                 # 文件操作工具
│   │   └── schedule.ts             # 定时任务封装（node-cron）
│   │
│   └── index.ts                    # 应用入口（Express + 路由注册 + 机器人初始化）
│
├── scripts/
│   └── build.js                    # 自定义构建脚本（含 terser 代码压缩）
│
├── package.json
├── tsconfig.json
├── .env.example                    # 环境变量示例
└── .env                            # 本地环境变量（不提交）
```

---

## 核心模块详解

### 应用入口

**文件：** `src/index.ts`

应用启动入口，依次完成：

1. 创建 Express 实例，注册 JSON 中间件
2. 挂载开放接口路由 `/api/open`
3. 监听端口（默认 `1801`）
4. 调用 `initRobot()` 启动机器人全部子服务

---

### 机器人主逻辑

**文件：** `src/services/robot.ts`

机器人的核心调度中心，管理消息收集、路由分发和响应回写。

**消息收集机制：**

钉钉收到消息后，不立即处理，而是存入 `Set<Info>` 集合。每 2 秒心跳触发一次批量处理，将集合内全部消息合并为一条字符串后统一路由。这样设计的原因是用户可能快速连续发送多条消息，心跳聚合后统一处理，既减少 AI 调用次数，也能让 AI 看到完整上下文。

```
钉钉消息推送
    │
    ▼
info.add({ type: "message", content, createdAt })
    │
    ▼ （每 2 秒心跳触发）
handleInfo(Array.from(info), info)
    │
    ├── newInfoLength > 5 条 或 content.length > 100 字
    │       └──→ handleBrain(content)           直接大脑处理
    │
    └── 其他情况
            └──→ handleNeural(content, infoSet) 中枢神经判断
```

**`handleBrain`：** 从缓存获取该用户的未归档聊天记录和全部记忆，调用大脑 Agent，将回复逐条发送给用户并入库。

**`handleNeural`：** 调用中枢神经 Agent，根据 `action` 分三路处理：

- `reply`：直接发送回复并入库
- `brain`：转交 `handleBrain` 深度处理
- `ignore`：将消息标记为 `pending` 存回集合，等待后续上下文补全

---

### 钉钉集成服务

#### 消息监听（`src/services/dingtalk/index.ts`）

通过 `dingtalk-stream` SDK 建立 WebSocket 长连接，实时接收钉钉机器人消息。

**消息处理流程：**

```
钉钉 Stream 消息推送
    │
    ▼
解析消息体（msgtype / content / userId / conversationType 等）
    │
    ▼
立即发送 EventAck.SUCCESS（防止钉钉重试）
    │
    ├── 群消息      → 回复"我暂不支持读取群消息哦~"         return
    ├── 非管理员    → 回复"我暂不支持读取非管理员消息哦~"    return
    └── 非文本消息  → 回复"我暂不支持读取非文本消息哦~"     return
    │
    ▼
写入数据库（addChatRecord，type: "user"）
    │
    ▼
调用 sendFn(msg.content) 传递给机器人主逻辑
```

> **设计说明：** EventAck 在收到消息后立即响应，与业务逻辑解耦，避免因 AI 处理耗时导致钉钉超时重试。

#### 消息发送（`src/services/dingtalk/send.ts`）

主动向管理员发送消息，使用钉钉 `robot/oToMessages/batchSend` 接口。

**Token 缓存机制：**

Access Token 有效期约 2 小时，本地内存缓存并提前 5 分钟刷新，每次发消息前检查缓存，避免频繁获取 Token。

**消息类型支持：**

| `msgtype`  | 对应钉钉 `msgKey` | 说明                                             |
| ---------- | ----------------- | ------------------------------------------------ |
| `text`     | `sampleText`      | 纯文本消息                                       |
| `markdown` | `sampleMarkdown`  | Markdown 富文本，自动提取第一行（≤10字）作为标题 |

---

### 豆包 AI 服务

**文件：** `src/services/doubao/index.ts`

封装豆包 Seed Responses API 的核心调用逻辑，支持工具调用的递归处理。

**核心函数 `chat()`：**

```typescript
chat({
  messages: Message[],    // 对话消息列表
  tools?: Tool[],         // 可选工具列表
  textFormat?: object,    // 可选结构化输出 JSON Schema
})
```

**工具调用循环：**

每次 AI 响应后，检查输出中是否包含 `function_call` 类型的输出项。若有，并行执行所有工具调用，将结果作为 `function_call_output` 传回 API 继续对话。最多循环 **5 轮**，防止死循环。

```
第一轮请求（input: messages）
    │
    ▼
响应输出检查
    ├── 无工具调用 → 提取 output_text 返回
    └── 有工具调用（depth ≤ 5）
            │
            ▼
        并行执行所有工具
            │
            ▼
        chatWithTools（previous_response_id + tool outputs）
            │
            └── 递归检查，直到无工具调用或达到上限
```

**API 端点：** `https://ark.cn-beijing.volces.com/api/v3/responses`

**使用模型：** `doubao-seed-2-0-lite-260215`

---

### 三 Agent 路由机制

#### 中枢神经 Agent（`src/services/doubao/agents/neural.ts`）

**定位：** 轻量、快速的第一道判断，无记忆、无工具注入。

**输入：** 用户消息文本

**输出（结构化 JSON）：**

```typescript
interface NeuralResult {
  action: "brain" | "reply" | "ignore";
  messages: string[];
}
```

| action   | 含义       | 触发条件                                   |
| -------- | ---------- | ------------------------------------------ |
| `reply`  | 直接回复   | 简单问候、日常闲聊                         |
| `brain`  | 转大脑处理 | 涉及历史记忆、实时信息、复杂查询、个人信息 |
| `ignore` | 暂不回复   | 消息不完整，明显处于连续输入中             |

**异常降级：** JSON 解析失败时默认返回 `{ action: "brain", messages: [] }`，保证复杂消息不会丢失。

---

#### 大脑 Agent（`src/services/doubao/agents/brain.ts`）

**定位：** 携带完整上下文和工具能力的深度处理 Agent。

**输入：**

```typescript
brainAgent(
  content: string,       // 当前用户输入
  records: ChatRecord[], // 该用户未归档的近期聊天记录
  memories: Memory[],    // 全部历史记忆（日记忆 + 月记忆）
)
```

**上下文组装格式（传给 AI 的 user message）：**

```
【用户提问】
{content}

【历史记忆】
【2025-01-15】今天聊了关于项目进度的问题...
【2025-02】二月份主要讨论了技术选型...

【近期聊天记录】
用户：你好
AI：你好！有什么我可以帮你的吗？
```

**输出（结构化 JSON）：**

```json
{
  "messages": ["回复内容1", "回复内容2"]
}
```

每条消息控制在 1～200 字，支持多条拆分发送（如分步骤回复、自然换行）。

---

#### 记忆生成 Agent（`src/services/doubao/agents/memory.ts`）

提供两个函数：

- **`dayMemoryAgent(records)`**：将一天的聊天记录总结为简洁的日记忆文本
- **`monthMemoryAgent(memories)`**：将一个月的日记忆汇总为月度总结

---

#### 主动联系 Agent（`src/services/doubao/agents/proactive.ts`）

**定位：** 智能决策是否主动发起对话，避免骚扰用户。

**触发时机：** 心跳机制每 2 秒检查，随机间隔 20-50 分钟触发一次主动联系检查。

**输入：**

```typescript
proactiveAgent(
  records: ChatRecord[], // 近期聊天记录（含时间信息）
  memories: Memory[],    // 全部历史记忆
)
```

**输出（结构化 JSON）：**

```typescript
interface ProactiveResult {
  action: "speak" | "silent"; // speak 表示发消息，silent 表示沉默
  messages: string[]; // 消息内容数组
}
```

**智能决策原则**：

- 根据聊天记录中的时间戳判断沉默时长
- 今天已经主动发过消息，通常选择沉默
- 深夜（22:00-8:00）不要发消息
- 沉默时间很短（几小时内），选择沉默
- 用户正在活跃聊天中，选择沉默
- 没有合适的话题或理由，选择沉默

**工具使用**：

- `get_baidu_search`：搜索今日热点新闻作为话题
- `search_chat_records`：查找以前聊过的话题续集
- 也可以不用工具，直接从记忆或感受出发

---

#### Agent 公共函数（`src/services/doubao/agents/base.ts`）

为减少重复代码，封装了公共函数供所有 Agent 复用：

| 函数名                | 功能                           |
| --------------------- | ------------------------------ |
| `formatMemories`      | 格式化记忆列表                 |
| `formatRecords`       | 格式化聊天记录（带时间）       |
| `formatRecordsSimple` | 格式化聊天记录（不带时间）     |
| `createTextFormat`    | 创建 JSON Schema（结构化输出） |
| `parseJsonResult`     | 通用 JSON 解析器（带错误处理） |

---

### 智能记忆系统

**文件：** `src/services/memory/index.ts`

实现聊天记录的自动归档与长期记忆生成，通过定时任务驱动。

#### 日记忆生成

**触发时间：** 每天凌晨 3:05（cron: `5 3 * * *`）

**流程：**

```
查询前一天未归档的聊天记录（isMemorized = 0）
    │
    ├── 无记录 → 跳过
    │
    ▼
调用 dayMemoryAgent(records) 生成摘要文本
    │
    ▼
写入 memory 表（type: "day", date: "YYYY-MM-DD"）
    │
    ▼
批量更新 record 表（isMemorized = 1）
    │
    ▼
同步更新内存缓存（memoryStore.add / recordStore.markAsMemorized）
```

#### 月记忆生成

**触发时间：** 每月 1 号凌晨 3:05（cron: `5 3 1 * *`）

**流程：**

```
查询上月所有日记忆（type: "day", date LIKE "YYYY-MM-%"）
    │
    ├── 无日记忆 → 跳过
    │
    ▼
调用 monthMemoryAgent(dayMemories) 生成月度总结
    │
    ▼
写入 memory 表（type: "month", date: "YYYY-MM"）
    │
    ▼
删除已合并的日记忆（memory 表 + 内存缓存同步清理）
```

#### 记忆使用优先级

大脑 Agent 回答时遵循以下优先级：

1. **近期聊天记录**（未归档的原始对话）—— 追问、当前话题延续
2. **历史记忆**（日/月记忆摘要）—— 长期偏好、过去经历
3. **工具查询**（`search_chat_records`）—— 记忆内容模糊时补充检索

---

### 数据缓存层

系统启动时将数据库全量数据加载到内存，AI 调用时直接读取内存，零 I/O 延迟。

#### RecordStore（`src/stores/record.ts`）

内部使用 `Map<number, ChatRecord>` 存储，键为记录 ID。

| 方法                       | 说明                                        |
| -------------------------- | ------------------------------------------- |
| `init(records)`            | 初始化，清空并批量加载                      |
| `add(record)`              | 新增一条记录                                |
| `getByUserId(userId)`      | 按用户 ID 查询未归档记录（内容截断 100 字） |
| `getByGroupId(groupId)`    | 按群组 ID 查询未归档记录                    |
| `markAsMemorized(ids)`     | 批量标记为已归档                            |
| `searchByKeyword(keyword)` | 关键词全文搜索（内容截断 100 字）           |

> **截断说明：** 内容超过 100 字时自动截断并追加 `...`，减少 AI 输入 Token 用量。

#### MemoryStore（`src/stores/memory.ts`）

内部使用 `Map<number, Memory>` 存储，键为记忆 ID。

| 方法               | 说明                                   |
| ------------------ | -------------------------------------- |
| `init(memories)`   | 初始化，清空并批量加载                 |
| `add(memory)`      | 新增一条记忆                           |
| `getAll()`         | 获取全部记忆，按 date 升序排列         |
| `removeByIds(ids)` | 批量删除（月记忆合并后清除对应日记忆） |

> **单例模式：** Store 文件顶层声明 Map 变量（模块级单例），`createStore()` 返回操作闭包，全应用共享同一份数据。

---

### 工具调用系统

**文件：** `src/services/doubao/tools/index.ts`

#### `get_baidu_search(query)`

调用百度千帆 AI 搜索接口，返回 `NewsItem[]`，每条结果内容截断 360 字。

**触发场景：** 时事热点、实时天气、近期动态等需要外部信息的问题。

#### `search_chat_records(keyword)`

从 RecordStore 内存缓存中关键词全文搜索历史聊天记录。

**触发场景：** 用户询问之前说过的内容、查找历史信息。

#### `speak_to_user(message, delayMs?)`

延迟发送钉钉消息，使用 `setTimeout` 实现非阻塞延迟。

**触发场景：** 用户要求"N 分钟后提醒我..."等定时消息需求。

---

### 开放接口服务

**文件：** `src/routes/open.ts`、`src/routes/middleware/steamAuth.ts`

支持外部系统通过 HTTP 接口向管理员发送钉钉消息，适用于业务系统告警通知、工作流推送等场景。

**认证中间件（steamAuth）：**

所有 `/api/open/*` 请求必须携带以下请求头：

| Header           | 说明           | 校验规则                     |
| ---------------- | -------------- | ---------------------------- |
| `x-system-id`    | 调用方系统标识 | 非空（后续可扩展白名单校验） |
| `x-system-token` | 调用方系统令牌 | 非空（后续可扩展签名校验）   |
| `x-open-key`     | 开放接口密钥   | 必须匹配 `OPEN_KEY` 环境变量 |

---

## 数据库设计

### record 表（聊天记录）

| 字段          | 类型               | 说明                     |
| ------------- | ------------------ | ------------------------ |
| `id`          | INT AUTO_INCREMENT | 主键                     |
| `userId`      | VARCHAR(100)       | 钉钉用户 ID              |
| `groupId`     | VARCHAR(100)       | 群组 ID（私聊为空）      |
| `userName`    | VARCHAR(100)       | 用户昵称                 |
| `groupName`   | VARCHAR(200)       | 群组名（私聊为空）       |
| `content`     | TEXT               | 消息内容                 |
| `type`        | VARCHAR(10)        | 消息类型：`user` / `ai`  |
| `isMemorized` | TINYINT(1)         | 是否已归档为记忆，默认 0 |
| `createdAt`   | TIMESTAMP          | 创建时间                 |

**索引：** `userId`、`groupId`、`type`、`createdAt`、`isMemorized`

**建表语句：**

```sql
CREATE TABLE IF NOT EXISTS record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(100) COMMENT '用户ID',
  groupId VARCHAR(100) COMMENT '群组ID',
  userName VARCHAR(100) COMMENT '用户名',
  groupName VARCHAR(200) COMMENT '群组名',
  content TEXT NOT NULL COMMENT '聊天内容',
  type VARCHAR(10) NOT NULL COMMENT '消息类型：user-用户消息，ai-AI消息',
  isMemorized TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已生成记忆',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_userId (userId),
  INDEX idx_groupId (groupId),
  INDEX idx_type (type),
  INDEX idx_createdAt (createdAt),
  INDEX idx_isMemorized (isMemorized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天记录表';
```

---

### memory 表（记忆归档）

| 字段        | 类型               | 说明                                        |
| ----------- | ------------------ | ------------------------------------------- |
| `id`        | INT AUTO_INCREMENT | 主键                                        |
| `type`      | VARCHAR(10)        | 记忆类型：`day` / `month` / `year`          |
| `content`   | TEXT               | 记忆摘要内容                                |
| `date`      | VARCHAR(20)        | 对应日期（日：`YYYY-MM-DD`，月：`YYYY-MM`） |
| `createdAt` | TIMESTAMP          | 创建时间                                    |

**索引：** `type`、`date`

**建表语句：**

```sql
CREATE TABLE IF NOT EXISTS memory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(10) NOT NULL COMMENT '记忆类型：day/month/year',
  content TEXT NOT NULL COMMENT '记忆内容',
  date VARCHAR(20) NOT NULL COMMENT '对应日期',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_type (type),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='记忆表';
```

> **说明：** 两张表均在服务启动时通过 `CREATE TABLE IF NOT EXISTS` 自动创建，无需手动执行建表脚本。

---

## API 接口文档

### GET /api/open

接口健康检查。

**请求头：** 同开放接口认证要求

**响应：**

```json
{
  "success": true,
  "message": "欢迎使用chat-bot开放接口"
}
```

---

### POST /api/open/send

向管理员发送钉钉消息。

**请求头：**

```
Content-Type: application/json
x-system-id: {系统标识}
x-system-token: {系统令牌}
x-open-key: {开放接口密钥}
```

**请求体：**

| 字段      | 类型   | 必填 | 说明                                  |
| --------- | ------ | ---- | ------------------------------------- |
| `msgtype` | string | 是   | `text` 或 `markdown`                  |
| `content` | string | 是   | 消息内容，markdown 类型时支持 MD 语法 |

**成功响应（200）：**

```json
{
  "success": true,
  "message": "消息发送成功"
}
```

**参数缺失（200）：**

```json
{
  "success": false,
  "message": "缺少必要参数：msgtype 和 content"
}
```

**认证失败（401）：**

```json
{
  "error": "OpenKey错误"
}
```

**服务异常（500）：**

```json
{
  "success": false,
  "message": "消息发送失败",
  "error": "错误详情"
}
```

**调用示例：**

```bash
# 发送文本消息
curl -X POST http://localhost:1801/api/open/send \
  -H "Content-Type: application/json" \
  -H "x-system-id: my-system" \
  -H "x-system-token: my-token" \
  -H "x-open-key: your_open_key" \
  -d '{"msgtype": "text", "content": "服务器告警：CPU 使用率超过 90%"}'

# 发送 Markdown 消息
curl -X POST http://localhost:1801/api/open/send \
  -H "Content-Type: application/json" \
  -H "x-system-id: my-system" \
  -H "x-system-token: my-token" \
  -H "x-open-key: your_open_key" \
  -d '{"msgtype": "markdown", "content": "## 每日报告\n- 今日订单：100\n- 总金额：¥9800"}'
```

---

## 环境变量配置

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

| 变量名                   | 必填 | 默认值      | 说明                                     |
| ------------------------ | ---- | ----------- | ---------------------------------------- |
| `PORT`                   | 否   | `1801`      | HTTP 服务监听端口                        |
| `OPEN_KEY`               | 否   | —           | 开放接口密钥，调用方需在请求头携带       |
| `DB_HOST`                | 是   | `localhost` | MySQL 数据库主机地址                     |
| `DB_PORT`                | 否   | `3306`      | MySQL 端口                               |
| `DB_USER`                | 是   | —           | 数据库用户名                             |
| `DB_PASSWORD`            | 是   | —           | 数据库密码                               |
| `DB_NAME`                | 是   | —           | 数据库名称                               |
| `DINGTALK_CLIENT_ID`     | 是   | —           | 钉钉开放平台应用的 AppKey                |
| `DINGTALK_CLIENT_SECRET` | 是   | —           | 钉钉开放平台应用的 AppSecret             |
| `DINGTALK_ADMIN_ID`      | 是   | —           | 管理员的钉钉用户 ID（staffId）           |
| `DINGTALK_ADMIN_NAME`    | 否   | —           | 管理员姓名，用于 AI 回复记录             |
| `SEED_API_KEY`           | 是   | —           | 豆包 Seed API 密钥（火山引擎控制台获取） |
| `BAIDU_API_KEY`          | 是   | —           | 百度千帆 API 密钥                        |

---

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- MySQL >= 5.7（推荐 8.0+）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填写所有必填配置
```

### 3. 准备 MySQL 数据库

```sql
-- 创建数据库（与 .env 中 DB_NAME 一致）
CREATE DATABASE `chat-bot` DEFAULT CHARACTER SET utf8mb4;

-- 创建专用用户（可选）
CREATE USER 'chat-bot'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON `chat-bot`.* TO 'chat-bot'@'%';
FLUSH PRIVILEGES;
```

> 无需手动建表，服务启动时自动创建 `record` 和 `memory` 表。

### 4. 配置钉钉应用

1. 前往[钉钉开放平台](https://open.dingtalk.com/)创建企业内部应用
2. 在应用中开启**机器人**功能
3. 将 `AppKey` 和 `AppSecret` 填入 `.env` 对应字段
4. 在钉钉通讯录中找到管理员的员工 ID（staffId）填入 `DINGTALK_ADMIN_ID`

### 5. 启动开发模式

```bash
npm run dev
```

控制台应输出：

```
chat-bot running: http://localhost:1801
数据库连接成功
✅ 钉钉机器人已启动
✅ 记忆服务已启动
初始化聊天记录缓存完成，共加载 X 条记录
初始化记忆缓存完成，共加载 X 条记忆
```

---

## 部署指南

### 生产构建

```bash
# 构建（TypeScript 编译 + 路径别名解析 + terser 代码压缩）
npm run build

# 启动生产服务
npm start
```

构建产物位于 `dist/` 目录。

### 生产环境注意事项

| 项目             | 说明                                                             |
| ---------------- | ---------------------------------------------------------------- |
| **数据库连接池** | 默认 `connectionLimit: 10`，高并发场景可适当调高                 |
| **内存占用**     | 全量聊天记录加载到内存，数据量大时设置 `--max-old-space-size`    |
| **定时任务时区** | node-cron 默认使用系统时区，生产服务器确保时区为 `Asia/Shanghai` |
| **API 限额**     | 豆包和百度千帆均有调用限额，生产前确认额度及计费规则             |
| **日志采集**     | 当前仅 `console.log`，生产建议对接日志平台（ELK / 阿里云日志等） |
| **数据库备份**   | 建议配置每日自动备份，防止记忆数据丢失                           |

---

## 数据流程说明

### 完整消息处理流程

```
① 用户在钉钉发送消息
        │
② 钉钉 Stream 推送到 DWClient
        │
③ 消息过滤（群消息 / 非管理员 / 非文本） → 不通过则直接回复提示并 return
        │
④ 写入 record 表 + 更新 RecordStore 缓存（type: "user"）
        │
⑤ sendFn(content) 写入 info Set
        │
⑥ 心跳（2s）触发 handleInfo，合并全部消息内容
        │
⑦ 路由判断
    ├── > 5条 或 > 100字 → 大脑 Agent
    └── 其他 → 中枢神经 Agent
            ├── action: reply  → ⑧
            ├── action: brain  → 大脑 Agent → ⑧
            └── action: ignore → 标记 pending，等待下次心跳
        │
⑧ 大脑 Agent 调用 doubao chat()
    ├── 可能调用工具（最多5轮递归）
    │   ├── get_baidu_search    → 百度千帆 API
    │   ├── search_chat_records → RecordStore 内存查询
    │   └── speak_to_user       → setTimeout 延迟发送
    └── 返回 messages 数组
        │
⑨ 逐条调用 send() 发送钉钉消息
        │
⑩ 写入 record 表 + 更新 RecordStore 缓存（type: "ai"）
```

### 记忆归档流程

```
每天凌晨 3:05
        │
查询昨天 isMemorized=0 的聊天记录
        │
dayMemoryAgent() 生成日记忆摘要
        │
写入 memory 表（type: "day"）+ 同步 MemoryStore
        │
批量 UPDATE record SET isMemorized=1 + 同步 RecordStore


每月 1 号凌晨 3:05
        │
查询上月所有日记忆（date LIKE "YYYY-MM-%"）
        │
monthMemoryAgent() 生成月度总结
        │
写入 memory 表（type: "month"）+ 同步 MemoryStore
        │
DELETE 对应日记忆 + MemoryStore.removeByIds()
```

---

## 安全说明

1. **`.env` 文件**：包含所有密钥，严禁提交到代码仓库，已在 `.gitignore` 中排除
2. **数据库权限**：建议使用最小权限账号，仅授权 chat-bot 数据库的读写权限
3. **开放接口**：`OPEN_KEY` 作为基础认证，生产环境建议同时配置 IP 白名单或 Nginx 访问控制
4. **AI 安全边界**：系统提示词中已明确限制不讨论政治敏感话题、不提供专业建议、不泄露内部信息
5. **密钥轮换**：建议定期轮换 `SEED_API_KEY`、`BAIDU_API_KEY` 等外部服务密钥

---

## 常见问题

**Q: 服务启动后钉钉没有响应？**

检查以下几点：

- `DINGTALK_CLIENT_ID` 和 `DINGTALK_CLIENT_SECRET` 是否正确
- 钉钉应用是否已开启机器人功能并发布上线
- 控制台是否输出 `✅ 钉钉机器人已启动`

---

**Q: AI 回复失败，控制台报 API 错误？**

- 检查 `SEED_API_KEY` 是否有效及额度是否充足
- 确认火山引擎控制台中 `doubao-seed-2-0-lite-260215` 模型已开通

---

**Q: 百度搜索工具不生效？**

- 检查 `BAIDU_API_KEY` 是否正确
- 确认百度千帆控制台中 AI 搜索服务已开通

---

**Q: 数据库连接失败？**

- 检查 `.env` 中数据库配置是否正确
- 确认数据库服务已启动，用户有对应数据库的访问权限
- 检查防火墙是否放通 `DB_PORT` 端口

---

**Q: 记忆服务不生成记忆？**

- 确保服务在凌晨 3:05 前后持续运行（不可重启）
- 检查当天是否有未归档的聊天记录（`isMemorized = 0`）
- 查看控制台中 `[记忆服务]` 前缀的日志输出

---

**Q: 内存占用随时间持续增长？**

聊天记录全量加载到内存，长期运行后占用增加属正常现象。建议：

- 定期清理已归档的历史记录（`isMemorized = 1` 的记录在记忆生成后可安全归档删除）
- 设置 PM2 内存超限自动重启：`pm2 start dist/index.js --max-memory-restart 500M`
