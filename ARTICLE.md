# 从零打造一个有记忆、会主动找你聊天的 AI 机器人

> 本文将带你深入了解如何基于 Node.js + TypeScript 构建一个智能聊天机器人，它不仅能回答问题，还拥有长期记忆、能主动发起对话，甚至可以通过开放接口供其他系统调用。

## 前言

在 AI 大模型爆发的时代，我们已经习惯了与 ChatGPT、Claude 等 AI 助手对话。但你有没有想过，如果 AI 不只是被动回答问题，而是能记住你们的聊天历史、了解你的偏好、甚至在你沉默太久时主动找你聊天，会是什么体验？

本文将介绍一个完整的 AI 聊天机器人项目——**chat-bot**，它基于钉钉平台，集成了豆包大模型，具备以下核心能力：

- **智能对话**：通过中枢神经和大脑双层架构，实现快速响应与深度思考的平衡
- **长期记忆**：自动将聊天记录归档为日记忆、月记忆，形成对用户的长期认知
- **主动联系**：在用户沉默超过一定时间后，主动发起对话
- **工具调用**：支持百度搜索、聊天记录查询、定时提醒等工具
- **开放接口**：提供 HTTP API，供其他系统发送钉钉消息

## 一、项目架构总览

### 1.1 技术栈

| 技术                    | 用途                         |
| ----------------------- | ---------------------------- |
| Node.js + TypeScript    | 后端运行环境和语言           |
| Express                 | HTTP 服务框架                |
| MySQL                   | 数据持久化                   |
| 钉钉 Stream SDK         | 消息接收（WebSocket 长连接） |
| 钉钉 Open API           | 消息发送                     |
| 豆包 Seed Responses API | AI 大模型调用                |
| 百度 API                | 实时搜索能力                 |
| node-cron               | 定时任务调度                 |

### 1.2 系统架构图

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
│         │                                                │
│         ├── 中枢神经 Agent（快速响应）                     │
│         │      ├── reply → 直接回复                       │
│         │      ├── brain → 转交大脑                       │
│         │      └── ignore → 等待上下文                    │
│         │                                                │
│         └── 大脑 Agent（深度处理）                         │
│                ├── 百度搜索工具                            │
│                ├── 聊天记录查询工具                        │
│                └── 定时提醒工具                            │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                    数据存储层                             │
│    MySQL（持久化）          内存缓存（RecordStore）        │
│    - record 表（聊天记录）   - MemoryStore（记忆缓存）     │
│    - memory 表（记忆）                                     │
└─────────────────────────────────────────────────────────┘
```

### 1.3 目录结构

```
src/
├── api/                    # 外部 API 封装
│   ├── baiduApi.ts        # 百度搜索 API
│   └── request.ts         # HTTP 请求封装
├── db/                     # 数据库操作
│   ├── memory.ts          # 记忆表操作
│   ├── mysql.ts           # 数据库连接池
│   └── record.ts          # 聊天记录表操作
├── routes/                 # 路由
│   ├── middleware/
│   │   └── steamAuth.ts   # 开放接口认证中间件
│   └── open.ts            # 开放接口路由
├── services/               # 核心服务
│   ├── dingtalk/          # 钉钉集成
│   │   ├── index.ts       # 消息监听
│   │   └── send.ts        # 消息发送
│   ├── doubao/            # 豆包 AI 服务
│   │   ├── agents/        # Agent 实现
│   │   │   ├── brain.ts   # 大脑 Agent
│   │   │   ├── memory.ts  # 记忆生成 Agent
│   │   │   ├── neural.ts  # 中枢神经 Agent
│   │   │   └── proactive.ts # 主动联系 Agent
│   │   ├── prompts/       # 提示词
│   │   ├── tools/         # 工具实现
│   │   └── index.ts       # AI 调用核心
│   ├── memory/            # 记忆服务
│   │   └── index.ts       # 记忆生成调度
│   └── robot.ts           # 机器人主逻辑
├── stores/                 # 内存缓存
│   ├── memory.ts          # 记忆缓存
│   └── record.ts          # 聊天记录缓存
├── types/                  # 类型定义
├── utils/                  # 工具函数
│   ├── delay.ts           # 延迟函数
│   ├── file.ts            # 文件操作
│   └── schedule.ts        # 定时任务封装
└── index.ts               # 应用入口
```

## 二、核心模块详解

### 2.1 应用入口

应用入口文件 `src/index.ts` 负责初始化 Express 服务和启动机器人：

```typescript
import express from "express";
import { initRobot } from "@/services/robot";
import openRoutes from "@/routes/open";

const app = express();
const PORT = Number(process.env.PORT) || 1801;

app.use(express.json());

// 注册路由
app.use("/api/open", openRoutes);

const main = (): void => {
  app.listen(PORT, () => {
    console.log(`chat-bot running: http://localhost:${PORT}`);
    initRobot();
  });
};

main();
```

这里有几个设计要点：

1. **端口配置**：默认使用 1801 端口，可通过环境变量 `PORT` 覆盖
2. **JSON 中间件**：用于解析开放接口的请求体
3. **启动顺序**：先启动 HTTP 服务，再初始化机器人，确保接口可用后再连接钉钉

### 2.2 钉钉消息监听

钉钉消息监听采用 **Stream 长连接** 方式，相比传统的 Webhook 回调，有以下优势：

- **无需公网 IP**：不需要暴露服务到外网
- **更低延迟**：WebSocket 长连接，消息推送更快
- **更简单部署**：不需要配置域名和 HTTPS 证书

```typescript
// src/services/dingtalk/index.ts
import { DWClient, EventAck, TOPIC_ROBOT } from "dingtalk-stream";

const client = new DWClient({ clientId, clientSecret });

client.registerCallbackListener(TOPIC_ROBOT, async (event) => {
  const data = JSON.parse(event.data as string);
  const msg = {
    msgtype: data.msgtype,
    content: data.text?.content || "",
    userId: data.senderStaffId,
    name: data.senderNick,
    groupId: data.conversationType === "2" ? data.conversationId : "",
    groupName: data.conversationType === "2" ? data.conversationTitle : "",
    isGroup: data.conversationType === "2",
    sessionWebhook: data.sessionWebhook,
  };

  // 立即发送确认响应，避免钉钉重试
  client.socketCallBackResponse(event.headers.messageId, {
    status: EventAck.SUCCESS,
  });

  // 消息过滤逻辑...
});
```

**关键设计点**：

1. **立即确认**：收到消息后立即发送 `EventAck.SUCCESS`，与业务逻辑解耦，避免因 AI 处理耗时导致钉钉超时重试
2. **消息过滤**：过滤群消息、非管理员消息、非文本消息，并给出友好提示
3. **消息记录**：将用户消息写入数据库，供后续记忆生成使用

### 2.3 消息发送服务

消息发送服务 `src/services/dingtalk/send.ts` 封装了钉钉消息发送的完整逻辑：

```typescript
interface SendData {
  msgtype: string;
  content: string;
  userIds?: string[]; // 指定用户 ID 列表
  conversationId?: string; // 指定群会话 ID
}

async function send(data: SendData): Promise<void> {
  const token = await getToken();
  const headers = { "x-acs-dingtalk-access-token": token };
  const { msgKey, msgParam } = buildMsgParam(data.msgtype, data.content);

  if (data.conversationId) {
    // 发送群消息
    await post(
      "https://api.dingtalk.com/v1.0/robot/groupMessages/send",
      {
        robotCode: clientId,
        openConversationId: data.conversationId,
        msgKey,
        msgParam,
      },
      { headers },
    );
  } else {
    // 发送单聊消息
    const targetIds = data.userIds?.length ? data.userIds : [adminId];
    await post(
      "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend",
      {
        robotCode: clientId,
        userIds: targetIds,
        msgKey,
        msgParam,
      },
      { headers },
    );
  }
}
```

**Token 缓存机制**：

钉钉 Access Token 有效期约 2 小时，项目实现了智能缓存：

```typescript
let cachedToken: string | null = null;
let tokenExpireTime = 0;

async function getToken(): Promise<string> {
  const now = Date.now();

  // 缓存有效，直接返回
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  // 重新获取
  const res = await post<{ accessToken: string; expireIn?: number }>(
    "https://api.dingtalk.com/v1.0/oauth2/accessToken",
    { appKey: clientId, appSecret: clientSecret },
  );

  cachedToken = res.accessToken;
  // 提前 5 分钟过期，避免边界问题
  tokenExpireTime = now + (res.expireIn ?? 7200) * 1000 - 5 * 60 * 1000;

  return cachedToken;
}
```

**Markdown 消息处理**：

对于 Markdown 类型的消息，自动提取第一行作为标题：

```typescript
function buildMsgParam(msgtype: string, content: string) {
  const msgKey = msgtype === "markdown" ? "sampleMarkdown" : "sampleText";
  let msgParam: Record<string, unknown> = { content };

  if (msgtype === "markdown") {
    // 提取第一行作为标题，过滤 markdown 符号，取前 10 个字
    const firstLine = content.split("\n")[0] ?? "";
    const title = firstLine
      .replace(/[*#`\-\[\]!]/g, "")
      .trim()
      .slice(0, 10);
    msgParam = { title, text: content };
  }

  return { msgKey, msgParam: JSON.stringify(msgParam) };
}
```

## 三、AI 大脑：双层 Agent 架构

这是整个项目最核心的部分。为了平衡响应速度和处理深度，项目采用了 **双层 Agent 架构**：

### 3.1 架构设计

```
用户消息
    │
    ▼
┌─────────────────┐
│  中枢神经 Agent  │  ← 快速、轻量、无记忆无工具
│  （neuralAgent） │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  reply    brain
  直接回复   转交大脑
              │
              ▼
    ┌─────────────────┐
    │   大脑 Agent     │  ← 深度、完整、有记忆有工具
    │  （brainAgent）  │
    └─────────────────┘
```

**设计思路**：

- **中枢神经 Agent**：处理简单问题，如问候、闲聊、简单问答。响应快，成本低
- **大脑 Agent**：处理复杂问题，需要记忆和工具支持。响应慢，但能力强大
- **路由判断**：由中枢神经 Agent 自行判断是否需要转交大脑

### 3.2 中枢神经 Agent

中枢神经 Agent 的核心职责是 **快速响应** 和 **智能路由**：

```typescript
// src/services/doubao/agents/neural.ts
export const neuralAgent = async (content: string): Promise<NeuralResult> => {
  const messages: Message[] = [
    { role: "system", content: NEURAL_AGENT_PROMPT },
    { role: "user", content: `【用户提问】\n${content}` },
  ];

  const result = await chat({ messages, textFormat: TEXT_FORMAT });
  return parseResult(result);
};
```

**提示词设计要点**：

1. **明确角色**：定义机器人的名字和性格
2. **判断标准**：清晰列出需要转交大脑的场景
3. **输出格式**：强制 JSON 输出，包含 action 和 messages

```typescript
// 结构化输出 Schema
const TEXT_FORMAT = {
  type: "json_schema",
  name: "neural_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["brain", "reply", "ignore"],
        description: "处理动作",
      },
      messages: {
        type: "array",
        items: { type: "string" },
        description: "回复消息数组",
      },
    },
    required: ["action", "messages"],
  },
};
```

**三种处理动作**：

| action   | 含义     | 使用场景                       |
| -------- | -------- | ------------------------------ |
| `reply`  | 直接回复 | 简单问候、日常闲聊、常识问题   |
| `brain`  | 转交大脑 | 涉及记忆、需要搜索、复杂问题   |
| `ignore` | 暂不回复 | 用户正在连续输入、上下文不完整 |

### 3.3 大脑 Agent

大脑 Agent 是机器人的"智慧核心"，具备完整的记忆和工具调用能力：

```typescript
// src/services/doubao/agents/brain.ts
export const brainAgent = async (
  content: string,
  records: ChatRecord[],
  memories: Memory[],
): Promise<string[]> => {
  const messages: Message[] = [
    { role: "system", content: BRAIN_AGENT_PROMPT },
    {
      role: "user",
      content: [
        `【用户提问】\n${content}`,
        `【历史记忆】\n${formatMemories(memories)}`,
        `【近期聊天记录】\n${formatRecords(records)}`,
      ].join("\n\n"),
    },
  ];

  const tools: Tool[] = [
    // 百度搜索工具
    // 聊天记录查询工具
    // 定时提醒工具
  ];

  const result = await chat({ messages, tools, textFormat: TEXT_FORMAT });
  return parseMessages(result);
};
```

**上下文信息**：

大脑 Agent 每次调用都会收到三类信息：

1. **用户提问**：当前用户说的话
2. **历史记忆**：对过去对话的总结，反映长期信息
3. **近期聊天记录**：最近尚未归档的聊天内容

### 3.4 工具调用机制

项目实现了完整的工具调用循环，支持 AI 在对话中使用工具：

```typescript
// src/services/doubao/index.ts
const MAX_TOOL_ROUNDS = 5;

const handleResponse = async (
  result: ResponsesResponse,
  toolHandlerMap: Map<string, (args: string) => Promise<string>>,
  depth: number,
): Promise<string> => {
  const toolCalls = result.output.filter((o) => o.type === "function_call");

  // 无工具调用，直接返回
  if (toolCalls.length === 0 || toolHandlerMap.size === 0) {
    return extractText(result.output);
  }

  // 超过最大轮数
  if (depth >= MAX_TOOL_ROUNDS) {
    return extractText(result.output) || "工具调用次数过多";
  }

  // 执行工具并递归
  const toolOutputs = await executeTools(toolCalls, toolHandlerMap);
  return chatWithTools(result.id, toolOutputs, toolHandlerMap, depth + 1);
};
```

**工具执行流程**：

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

**三个核心工具**：

#### 1. 百度搜索工具

```typescript
{
  type: "function",
  name: "get_baidu_search",
  description: "根据关键词进行百度搜索，获取最新的相关信息",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "搜索关键词" },
    },
    required: ["query"],
  },
  handler: async (args: string) => {
    const { query } = JSON.parse(args);
    const results = await getBaiduSearch(query);
    // 格式化搜索结果
    return formatSearchResults(results);
  },
}
```

#### 2. 聊天记录查询工具

```typescript
{
  type: "function",
  name: "search_chat_records",
  description: "根据关键词搜索历史聊天记录",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: "string", description: "搜索关键词" },
    },
    required: ["keyword"],
  },
  handler: async (args: string) => {
    const { keyword } = JSON.parse(args);
    const results = search_chat_records(keyword);
    return formatRecords(results);
  },
}
```

#### 3. 定时提醒工具

```typescript
{
  type: "function",
  name: "speak_to_user",
  description: "发起会话，用于让AI主动发起对话",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "会话内容" },
      delay_ms: { type: "number", description: "延迟时间（毫秒）" },
    },
    required: ["message", "delay_ms"],
  },
  handler: async (args: string) => {
    const { message, delay_ms } = JSON.parse(args);
    speak_to_user(message, delay_ms);
    return "会话已发起";
  },
}
```

## 四、记忆系统：让 AI 拥有长期记忆

### 4.1 记忆架构

项目的记忆系统采用 **三级归档** 策略：

```
聊天记录（record 表）
    │
    ▼ （每天凌晨 3:05）
日记忆（memory 表，type: day）
    │
    ▼ （每月 1 号凌晨 3:05）
月记忆（memory 表，type: month）
```

**设计优势**：

1. **数据压缩**：将大量聊天记录压缩为精炼的记忆摘要
2. **时间分层**：日记忆关注细节，月记忆关注趋势
3. **自动清理**：生成月记忆后自动删除对应日记忆，节省存储

### 4.2 记忆生成

记忆生成由专门的 Agent 完成：

```typescript
// src/services/doubao/agents/memory.ts
export const dayMemoryAgent = async (
  records: ChatRecord[],
): Promise<string> => {
  const messages: Message[] = [
    { role: "system", content: DAY_MEMORY_PROMPT },
    { role: "user", content: `【聊天记录】\n${formatRecords(records)}` },
  ];
  return chat({ messages });
};

export const monthMemoryAgent = async (memories: Memory[]): Promise<string> => {
  const messages: Message[] = [
    { role: "system", content: MONTH_MEMORY_PROMPT },
    { role: "user", content: `【日记忆列表】\n${formatMemories(memories)}` },
  ];
  return chat({ messages });
};
```

**日记忆提示词要点**：

- 提取关键信息：用户提到的重要事件、决定、偏好
- 忽略无关内容：简单问候、无意义对话
- 保持客观：不添加 AI 的主观判断

### 4.3 记忆调度

记忆生成通过定时任务自动执行：

```typescript
// src/services/memory/index.ts
export async function initMemory(): Promise<void> {
  await createRecordTable();
  await createMemoryTable();

  // 加载记忆缓存
  const memories = await getAllMemories();
  memoryStore.init(memories);

  // 每天凌晨 3:05 生成前一天日记忆
  createSchedule({
    cronExpression: "5 3 * * *",
    taskName: "日记忆生成",
    task: generateDayMemory,
  });

  // 每月 1 号凌晨 3:05 生成上月月记忆
  createSchedule({
    cronExpression: "5 3 1 * *",
    taskName: "月记忆生成",
    task: generateMonthMemory,
  });
}
```

### 4.4 内存缓存

为了提高查询效率，项目实现了内存缓存层：

```typescript
// src/stores/record.ts
const createRecordStore = () => {
  return {
    init(records: ChatRecord[]) {
      allChatRecords.clear();
      for (const record of records) {
        allChatRecords.set(record.id, record);
      }
    },

    getByUserId(userId: string): ChatRecord[] {
      return Array.from(allChatRecords.values())
        .filter((r) => r.userId === userId && !r.isMemorized)
        .map((r) => ({
          ...r,
          content:
            r.content.length > 100
              ? r.content.slice(0, 100) + "..."
              : r.content,
        }));
    },

    searchByKeyword(keyword: string): ChatRecord[] {
      return Array.from(allChatRecords.values()).filter((r) =>
        r.content.includes(keyword),
      );
    },
  };
};
```

**缓存策略**：

1. **启动加载**：服务启动时从数据库加载所有记录到内存
2. **实时同步**：新增记录时同时写入数据库和缓存
3. **标记更新**：生成记忆后批量标记记录为已归档

## 五、主动联系：AI 也能主动找你聊天

### 5.1 设计理念

传统的聊天机器人都是被动响应，用户不说话，机器人就沉默。但真实的社交关系中，朋友之间会主动发起对话。项目实现了 **主动联系** 功能，让机器人在用户沉默太久时主动找话题聊天。

### 5.2 触发条件

```typescript
// 主动联系仅在此时间段内触发（小时）
const PROACTIVE_HOUR_START = 9;
const PROACTIVE_HOUR_END = 22;

// 沉默超过此小时数触发主动联系检查
const PROACTIVE_SILENCE_HOURS = 2;

// 生成随机检查间隔（20~50 分钟）
const randomCheckInterval = () =>
  Math.floor(Math.random() * 30 + 20) * 60 * 1000;
```

**触发条件**：

1. **时间范围**：只在 9:00 - 22:00 之间触发，避免打扰用户休息
2. **沉默时长**：用户超过 2 小时没有任何互动
3. **随机间隔**：每 20-50 分钟检查一次，避免机械感

### 5.3 主动联系 Agent

主动联系 Agent 会综合考虑多种因素，决定是否发消息以及发什么内容：

```typescript
// src/services/doubao/agents/proactive.ts
export const proactiveAgent = async (
  triggerReason: string,
  records: ChatRecord[],
  memories: Memory[],
): Promise<ProactiveResult> => {
  const messages: Message[] = [
    { role: "system", content: PROACTIVE_AGENT_PROMPT },
    {
      role: "user",
      content: [
        `【触发原因】\n${triggerReason}`,
        `【历史记忆】\n${formatMemories(memories)}`,
        `【近期聊天记录】\n${formatRecords(records)}`,
      ].join("\n\n"),
    },
  ];

  const tools: Tool[] = [
    // 百度搜索工具（获取今日热点）
    // 聊天记录查询工具（延续之前的话题）
  ];

  const result = await chat({ messages, tools, textFormat: TEXT_FORMAT });
  return parseResult(result);
};
```

**提示词设计**：

```typescript
export const PROACTIVE_AGENT_PROMPT = `你是机器人小红帽，现在考虑要不要主动联系用户。

【判断是否发消息】
综合考虑以下因素，自己决定发还是不发：
- 沉默了多久，时间长短会影响打招呼的自然程度
- 近期你已经主动说过几次，对方有没有回应
- 当前有没有合适的话题或理由
- 自己此刻的心情状态

你可以开心地找话题，可以若无其事随口一说，可以带点小情绪，也可以选择沉默——像真实的人一样自然就好。`;
```

**设计亮点**：

1. **拟人化**：赋予 AI "心情状态"，让主动联系更自然
2. **智能判断**：不是机械地定时发消息，而是综合考虑多种因素
3. **话题来源**：可以搜索今日热点，也可以延续之前的话题

### 5.4 心跳机制

主动联系检查集成在心跳机制中：

```typescript
// src/services/robot.ts
setInterval(async () => {
  // 处理消息队列
  if (info.size > 0) {
    handleInfo(Array.from(info), info);
    info.clear();
  }

  // 主动联系检查
  if (dayjs().isAfter(nextProactiveCheckAt)) {
    nextProactiveCheckAt = dayjs().add(randomCheckInterval(), "ms");
    checkProactive();
  }
}, 2000);
```

## 六、开放接口：让其他系统也能发消息

### 6.1 接口设计

项目提供了一个开放接口，允许其他系统通过 HTTP 请求发送钉钉消息：

```
POST /api/open/send
```

**请求头**：

| Header           | 说明           | 必填 |
| ---------------- | -------------- | ---- |
| `x-system-id`    | 调用方系统标识 | 是   |
| `x-system-token` | 调用方系统令牌 | 是   |
| `x-open-key`     | 开放接口密钥   | 是   |

**请求体**：

```json
{
  "msgtype": "text",
  "content": "消息内容"
}
```

### 6.2 认证中间件

```typescript
// src/routes/middleware/steamAuth.ts
export const steamAuthMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void => {
  const systemId = req.headers["x-system-id"] as string;
  const systemToken = req.headers["x-system-token"] as string;
  const openKey = req.headers["x-open-key"] as string;

  if (!systemToken || !systemId || !openKey) {
    res.status(401).json({ error: "系统ID、系统令牌和OpenKey均不能为空" });
    return;
  }

  if (openKey !== process.env.OPEN_KEY) {
    res.status(401).json({ error: "OpenKey错误" });
    return;
  }

  next();
};
```

### 6.3 消息路由

根据系统 ID 决定消息发送目标：

```typescript
// src/routes/open.ts
const systemId = req.headers["x-system-id"] as string;

if (systemId === "my-stock") {
  // 发送到指定群
  await send({ msgtype, content, conversationId: "123" });
} else {
  // 发送给管理员
  await send({ msgtype, content });
}
```

## 七、数据库设计

### 7.1 聊天记录表（record）

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天记录表'
```

### 7.2 记忆表（memory）

```sql
CREATE TABLE IF NOT EXISTS memory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(10) NOT NULL COMMENT '记忆类型：day/month/year',
  content TEXT NOT NULL COMMENT '记忆内容',
  date VARCHAR(20) NOT NULL COMMENT '对应日期',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_type (type),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='记忆表'
```

## 八、技术亮点与最佳实践

### 8.1 结构化输出

项目大量使用豆包 API 的 **结构化输出** 功能，确保 AI 返回的数据格式可控：

```typescript
const TEXT_FORMAT = {
  type: "json_schema",
  name: "brain_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["messages"],
  },
};
```

**优势**：

1. **类型安全**：返回值有明确的类型定义
2. **解析简单**：直接 `JSON.parse`，无需复杂的文本提取
3. **容错处理**：解析失败时有合理的降级策略

### 8.2 消息聚合

用户可能快速连续发送多条消息，项目通过 **心跳聚合** 机制优化处理：

```typescript
// 每 2 秒心跳触发一次
setInterval(async () => {
  if (info.size > 0) {
    handleInfo(Array.from(info), info);
    info.clear();
  }
}, 2000);
```

**处理策略**：

- **> 5 条消息** 或 **> 100 字**：直接交给大脑处理
- **其他情况**：先由中枢神经判断，可能等待更多上下文

### 8.3 错误处理

项目实现了完善的错误处理机制：

```typescript
try {
  const responses = await brainAgent(content, records, memories);
  responses.forEach((response) => sendMessageAndRecord(response));
} catch (error) {
  console.error("[机器人] 大脑处理失败:", error);
  // 可以在这里添加降级策略，如发送默认回复
}
```

### 8.4 环境变量管理

所有敏感配置都通过环境变量管理：

```typescript
const clientId = process.env.DINGTALK_CLIENT_ID;
const clientSecret = process.env.DINGTALK_CLIENT_SECRET;
const adminId = process.env.DINGTALK_ADMIN_ID;
const apiKey = process.env.SEED_API_KEY;
```

**环境变量清单**：

| 变量名                   | 说明               | 必填 |
| ------------------------ | ------------------ | ---- |
| `DINGTALK_CLIENT_ID`     | 钉钉应用 AppKey    | 是   |
| `DINGTALK_CLIENT_SECRET` | 钉钉应用 AppSecret | 是   |
| `DINGTALK_ADMIN_ID`      | 管理员钉钉 ID      | 是   |
| `DINGTALK_ADMIN_NAME`    | 管理员昵称         | 否   |
| `SEED_API_KEY`           | 豆包 API Key       | 是   |
| `BAIDU_API_KEY`          | 百度千帆 API Key   | 否   |
| `DB_HOST`                | 数据库地址         | 否   |
| `DB_PORT`                | 数据库端口         | 否   |
| `DB_USER`                | 数据库用户名       | 否   |
| `DB_PASSWORD`            | 数据库密码         | 否   |
| `DB_NAME`                | 数据库名           | 否   |
| `OPEN_KEY`               | 开放接口密钥       | 是   |
| `PORT`                   | HTTP 服务端口      | 否   |

## 九、部署与运行

### 9.1 环境准备

```bash
# 克隆项目
git clone https://github.com/pbstar/chat-bot.git
cd chat-bot

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写必要的配置
```

### 9.2 开发模式

```bash
npm run dev
```

### 9.3 生产部署

```bash
# 构建
npm run build

# 启动
npm start
```

### 9.4 Docker 部署

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 1801

CMD ["node", "-r", "dotenv/config", "dist/index.js"]
```

## 十、扩展与优化方向

### 10.1 多用户支持

当前项目主要面向单个管理员用户，可以扩展为多用户架构：

- 为每个用户维护独立的 RecordStore 和 MemoryStore
- 支持群聊消息处理
- 实现用户权限管理

### 10.2 更多工具

可以添加更多实用工具：

- **日历工具**：查询日程、添加提醒
- **天气工具**：查询天气预报
- **邮件工具**：发送邮件
- **笔记工具**：记录笔记

### 10.3 性能优化

- **数据库索引优化**：针对常用查询添加复合索引
- **缓存策略**：引入 Redis 替代内存缓存，支持多实例部署
- **消息队列**：使用消息队列处理高并发消息

### 10.4 监控与日志

- **性能监控**：集成 APM 工具，监控 API 调用耗时
- **错误追踪**：集成 Sentry 等错误追踪服务
- **日志系统**：使用结构化日志，便于分析和检索

## 总结

本文详细介绍了一个基于 Node.js + TypeScript 的 AI 聊天机器人项目的架构设计和核心实现。项目的主要特点包括：

1. **双层 Agent 架构**：通过中枢神经和大脑的分工，实现快速响应与深度处理的平衡
2. **长期记忆系统**：通过日记忆、月记忆的三级归档，让 AI 拥有长期记忆能力
3. **主动联系机制**：让 AI 能在适当时机主动发起对话，增强社交感
4. **工具调用能力**：支持搜索、查询、提醒等多种工具，扩展 AI 能力边界
5. **开放接口设计**：提供 HTTP API，便于与其他系统集成

这个项目展示了如何将大模型能力与实际业务场景结合，构建一个真正有用的 AI 助手。希望本文能为你在 AI 应用开发方面提供一些参考和启发。

---

**项目地址**：https://github.com/pbstar/chat-bot

**技术栈**：Node.js, TypeScript, Express, MySQL, 钉钉 SDK, 豆包大模型

**License**：MIT
