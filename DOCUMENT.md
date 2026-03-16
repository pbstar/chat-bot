# Chat Bot — 项目文档

> 基于豆包 Seed 大模型的智能聊天机器人，深度集成钉钉平台，具备三 Agent 智能路由、长期记忆归档、工具调用、开放接口等核心能力。

---

## 项目概述

Chat Bot 是一款面向企业内部的 AI 智能聊天机器人，通过钉钉 Stream 长连接接收消息，结合豆包 Seed 大模型进行智能回复。

| 特性                  | 说明                                                                |
| --------------------- | ------------------------------------------------------------------- |
| **三 Agent 智能路由** | 中枢神经 Agent 快速判断 + 大脑 Agent 深度处理 + 主动联系 Agent 决策 |
| **长期记忆系统**      | 自动生成日记忆和月记忆，实现 AI 对用户的长期认知积累                |
| **工具调用能力**      | 集成百度搜索、历史记录检索两大工具                                  |
| **内存缓存架构**      | 聊天记录和记忆均在内存缓存，AI 调用无需实时查库                     |
| **开放 HTTP 接口**    | 支持外部系统通过认证接口主动向管理员发送钉钉消息                    |
| **权限精准管控**      | 仅响应管理员私聊，自动过滤群消息、非管理员及非文本消息              |

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
│        └── search_chat_records 历史记录检索                │
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
│   │   └── request.ts              # axios 实例封装
│   ├── db/                         # 数据库操作层
│   │   ├── mysql.ts                # MySQL 连接池初始化
│   │   ├── record.ts               # 聊天记录 CRUD 及表创建
│   │   └── memory.ts               # 记忆 CRUD 及表创建
│   ├── routes/                     # HTTP 路由层
│   │   ├── middleware/
│   │   │   └── steamAuth.ts        # 开放接口认证中间件
│   │   └── open.ts                 # 开放接口路由
│   ├── services/                   # 业务服务层
│   │   ├── robot.ts                # 机器人主逻辑（消息路由与调度）
│   │   ├── dingtalk/
│   │   │   ├── index.ts            # 钉钉消息监听（Stream 接收 + 过滤）
│   │   │   └── send.ts             # 钉钉消息主动发送（含 Token 缓存）
│   │   ├── doubao/
│   │   │   ├── index.ts            # AI 对话核心（chat + 工具调用循环）
│   │   │   ├── agents/
│   │   │   │   ├── base.ts         # Agent 公共函数封装
│   │   │   │   ├── brain.ts        # 大脑 Agent（携带记忆+工具）
│   │   │   │   ├── neural.ts       # 中枢神经 Agent（快速判断）
│   │   │   │   ├── proactive.ts    # 主动联系 Agent（决策是否发消息）
│   │   │   │   └── memory.ts       # 记忆生成 Agent
│   │   │   ├── prompts/            # 各 Agent 系统提示词
│   │   │   └── tools/
│   │   │       └── index.ts        # 工具函数实现
│   │   └── memory/
│   │       └── index.ts            # 记忆服务（定时任务 + 归档流程）
│   ├── stores/                     # 内存缓存层（模块级单例）
│   │   ├── record.ts               # 聊天记录内存 Map
│   │   └── memory.ts               # 记忆内存 Map
│   ├── types/                      # TypeScript 全局类型定义
│   ├── utils/                      # 工具函数（delay / file / schedule）
│   └── index.ts                    # 应用入口
├── scripts/
│   └── build.js                    # 自定义构建脚本（含 terser 压缩）
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 核心设计详解

### 消息收集与心跳机制

**文件：** `src/services/robot.ts`

钉钉收到消息后不立即处理，而是存入 `Set<Info>` 集合。每 2 秒心跳触发一次批量处理，将集合内所有消息合并为一条字符串统一路由。这样设计是为了聚合用户连续发送的多条消息，减少 AI 调用次数，同时让 AI 看到完整上下文。

```
钉钉消息推送 → info.add({ type: "message", content, createdAt })
                          │
                  （每 2 秒心跳触发）
                          │
              handleInfo(Array.from(info), info)
                          │
     ┌────────────────────┴────────────────────┐
     │ 消息 > 5条 或 内容 > 100字               │ 其他情况
     ▼                                          ▼
handleBrain(content)                 handleNeural(content, infoSet)
（直接大脑处理）                      （中枢神经判断）
                                           │
                          ┌────────────────┼────────────────┐
                          ▼                ▼                ▼
                       reply             brain            ignore
                      直接回复         转大脑处理     标记 pending
                                                      等待下次心跳
```

心跳同时检查是否到达下次主动联系时间，随机间隔 20～50 分钟触发一次 `proactiveAgent`。

---

### 钉钉消息处理设计

**消息接收（`src/services/dingtalk/index.ts`）**

收到消息后立即发送 `EventAck.SUCCESS`，与业务逻辑解耦，防止因 AI 处理耗时导致钉钉超时重试。过滤逻辑在 Ack 之后同步执行：群消息、非管理员、非文本消息均回复提示并 return，不进入机器人流程。

**消息发送（`src/services/dingtalk/send.ts`）**

Access Token 有效期约 2 小时，本地内存缓存并提前 5 分钟刷新，避免频繁获取。支持 `text`（纯文本）和 `markdown`（自动提取首行作标题）两种消息类型。

---

### 三 Agent 路由机制

#### 中枢神经 Agent（`agents/neural.ts`）

轻量快速，无记忆、无工具，只取最近 8 条记录作为上下文。返回结构化 JSON：

```typescript
interface NeuralResult {
  action: "brain" | "reply" | "ignore";
  messages: string[];
}
```

| action   | 触发条件                         |
| -------- | -------------------------------- |
| `reply`  | 简单问候、日常闲聊，直接回复     |
| `brain`  | 涉及历史记忆、实时信息、复杂查询 |
| `ignore` | 消息不完整，明显处于连续输入中   |

JSON 解析失败时默认降级为 `{ action: "brain", messages: [] }`，保证复杂消息不丢失。

#### 大脑 Agent（`agents/brain.ts`）

携带完整上下文和工具能力，处理复杂问题。

```typescript
brainAgent(
  content: string,       // 当前用户输入
  records: ChatRecord[], // 未归档的近期聊天记录
  memories: Memory[],    // 全部历史记忆（日记忆 + 月记忆）
): Promise<string[]>
```

传给 AI 的 user message 格式：

```
【用户提问】{content}

【历史记忆】
【2025-01-15】今天聊了关于项目进度的问题...

【近期聊天记录】
用户：你好
AI：你好！有什么我可以帮你的吗？
```

输出为 `string[]`，每条消息 1～200 字，支持多条拆分发送。

#### 主动联系 Agent（`agents/proactive.ts`）

智能决策是否主动发起对话，避免骚扰用户。

```typescript
proactiveAgent(
  dayTime: string,       // 当前时间
  records: ChatRecord[], // 近期聊天记录
  memories: Memory[],    // 全部历史记忆
): Promise<ProactiveResult>

interface ProactiveResult {
  action: "speak" | "silent";
  messages: string[];
}
```

深夜（22:00-8:00）、今天已主动发过、沉默时间很短、用户正在活跃、没有合适话题时选择 `silent`。可调用 `get_baidu_search` 搜索今日热点，或 `search_chat_records` 查找历史话题切入点。

#### 记忆生成 Agent（`agents/memory.ts`）

- **`dayMemoryAgent(records)`**：将一天聊天记录总结为日记忆文本
- **`monthMemoryAgent(memories)`**：将一个月日记忆汇总为月度总结

#### Agent 公共函数（`agents/base.ts`）

| 函数名                | 功能                           |
| --------------------- | ------------------------------ |
| `formatMemories`      | 格式化记忆列表                 |
| `formatRecords`       | 格式化聊天记录（带时间）       |
| `formatRecordsSimple` | 格式化聊天记录（不带时间）     |
| `createTextFormat`    | 创建 JSON Schema（结构化输出） |
| `parseJsonResult`     | 通用 JSON 解析器（带错误处理） |

---

### 豆包 AI 服务设计

**文件：** `src/services/doubao/index.ts`

封装豆包 Seed Responses API，核心函数 `chat()` 支持工具调用递归处理：

```typescript
chat({
  messages: Message[],
  tools?: Tool[],
  textFormat?: object,  // JSON Schema，用于结构化输出
})
```

工具调用循环：每次响应后检查是否包含 `function_call`，若有则并行执行所有工具，将结果传回继续对话，**最多循环 5 轮**防止死循环。

**API：** `https://ark.cn-beijing.volces.com/api/v3/responses`  
**模型：** `doubao-seed-2-0-lite-260215`

---

### 工具调用系统

**文件：** `src/services/doubao/tools/index.ts`

| 工具名                | 说明                                        |
| --------------------- | ------------------------------------------- |
| `get_baidu_search`    | 调用百度千帆 AI 搜索，每条结果截断 360 字   |
| `search_chat_records` | 从 RecordStore 内存中关键词全文搜索历史记录 |

---

### 智能记忆系统

**文件：** `src/services/memory/index.ts`

#### 日记忆生成（每天凌晨 3:05）

```
查询前一天 isMemorized=0 的聊天记录
    ▼
dayMemoryAgent(records) 生成摘要
    ▼
写入 memory 表（type: "day"）+ 同步 MemoryStore 缓存
    ▼
批量 UPDATE record SET isMemorized=1 + 同步 RecordStore 缓存
```

#### 月记忆生成（每月 1 号凌晨 3:05）

```
查询上月所有日记忆（date LIKE "YYYY-MM-%"）
    ▼
monthMemoryAgent(dayMemories) 生成月度总结
    ▼
写入 memory 表（type: "month"）+ 同步 MemoryStore 缓存
    ▼
删除对应日记忆（DB + MemoryStore 同步清理）
```

---

### 数据缓存层设计

系统启动时全量加载数据库到内存，AI 调用直接读内存，零 I/O 延迟。Store 文件顶层声明 Map（模块级单例），全应用共享同一份数据。

**RecordStore（`stores/record.ts`）** — `Map<number, ChatRecord>`

| 方法                       | 说明                                        |
| -------------------------- | ------------------------------------------- |
| `init(records)`            | 初始化，清空并批量加载                      |
| `add(record)`              | 新增一条记录                                |
| `getByUserId(userId)`      | 按用户 ID 查询未归档记录（内容截断 100 字） |
| `getByGroupId(groupId)`    | 按群组 ID 查询未归档记录                    |
| `markAsMemorized(ids)`     | 批量标记为已归档                            |
| `searchByKeyword(keyword)` | 关键词全文搜索（内容截断 100 字）           |

**MemoryStore（`stores/memory.ts`）** — `Map<number, Memory>`

| 方法               | 说明                         |
| ------------------ | ---------------------------- |
| `init(memories)`   | 初始化，清空并批量加载       |
| `add(memory)`      | 新增一条记忆                 |
| `getAll()`         | 获取全部记忆，按 date 升序   |
| `removeByIds(ids)` | 批量删除（月记忆合并后清理） |

> 内容超过 100 字时自动截断并追加 `...`，减少 AI 输入 Token 用量。

---

### 开放接口设计

**文件：** `src/routes/open.ts`、`src/routes/middleware/steamAuth.ts`

支持外部系统通过 HTTP 接口向管理员发送钉钉消息，适用于告警通知、工作流推送等场景。

所有 `/api/open/*` 请求必须携带认证请求头：

| Header           | 校验规则                     |
| ---------------- | ---------------------------- |
| `x-system-id`    | 非空（可扩展白名单校验）     |
| `x-system-token` | 非空（可扩展签名校验）       |
| `x-open-key`     | 必须匹配 `OPEN_KEY` 环境变量 |

**接口：** `POST /api/open/send`，请求体 `{ msgtype: "text" | "markdown", content: string }`

---

## 数据库设计

> 两张表均通过 `CREATE TABLE IF NOT EXISTS` 在服务启动时自动创建。

### record 表（聊天记录）

| 字段          | 类型               | 说明                |
| ------------- | ------------------ | ------------------- |
| `id`          | INT AUTO_INCREMENT | 主键                |
| `userId`      | VARCHAR(100)       | 钉钉用户 ID         |
| `groupId`     | VARCHAR(100)       | 群组 ID（私聊为空） |
| `userName`    | VARCHAR(100)       | 用户昵称            |
| `groupName`   | VARCHAR(200)       | 群组名（私聊为空）  |
| `content`     | TEXT               | 消息内容            |
| `type`        | VARCHAR(10)        | `user` / `ai`       |
| `isMemorized` | TINYINT(1)         | 是否已归档，默认 0  |
| `createdAt`   | TIMESTAMP          | 创建时间            |

**索引：** `userId`、`groupId`、`type`、`createdAt`、`isMemorized`

### memory 表（记忆归档）

| 字段        | 类型               | 说明                            |
| ----------- | ------------------ | ------------------------------- |
| `id`        | INT AUTO_INCREMENT | 主键                            |
| `type`      | VARCHAR(10)        | `day` / `month`                 |
| `content`   | TEXT               | 记忆摘要内容                    |
| `date`      | VARCHAR(20)        | 日：`YYYY-MM-DD`，月：`YYYY-MM` |
| `createdAt` | TIMESTAMP          | 创建时间                        |

**索引：** `type`、`date`

---

## 环境变量配置

| 变量名                      | 必填 | 默认值      | 说明                                     |
| --------------------------- | ---- | ----------- | ---------------------------------------- |
| `PORT`                      | 否   | `1801`      | HTTP 服务监听端口                        |
| `OPEN_KEY`                  | 否   | —           | 开放接口密钥                             |
| `DB_HOST`                   | 是   | `localhost` | MySQL 数据库主机地址                     |
| `DB_PORT`                   | 否   | `3306`      | MySQL 端口                               |
| `DB_USER`                   | 是   | —           | 数据库用户名                             |
| `DB_PASSWORD`               | 是   | —           | 数据库密码                               |
| `DB_NAME`                   | 是   | —           | 数据库名称                               |
| `DINGTALK_CLIENT_ID`        | 是   | —           | 钉钉开放平台应用的 AppKey                |
| `DINGTALK_CLIENT_SECRET`    | 是   | —           | 钉钉开放平台应用的 AppSecret             |
| `DINGTALK_ADMIN_ID`         | 是   | —           | 管理员的钉钉用户 ID（staffId）           |
| `DINGTALK_ADMIN_NAME`       | 否   | —           | 管理员姓名，用于 AI 回复记录             |
| `DINGTALK_MYSTOCK_GROUP_ID` | 否   | —           | 特定群组 ID（有群消息推送需求时配置）    |
| `SEED_API_KEY`              | 是   | —           | 豆包 Seed API 密钥（火山引擎控制台获取） |
| `BAIDU_API_KEY`             | 是   | —           | 百度千帆 API 密钥                        |
