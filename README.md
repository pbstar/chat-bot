# Chat Bot - 智能聊天机器人

基于 AI 大模型的聊天机器人，支持钉钉机器人集成，具备智能对话、历史记录管理、记忆归档、百度搜索、主动联系等功能。

## 功能特性

- **智能对话**：基于豆包 Seed 大模型的自然语言对话能力
- **钉钉集成**：支持钉钉机器人管理员私聊
- **历史记录**：自动保存聊天记录，支持上下文对话
- **智能记忆**：自动生成日记忆和月记忆，实现长期记忆能力
- **三 Agent 架构**：中枢神经 Agent 快速判断、大脑 Agent 深度处理、主动联系 Agent 智能决策
- **工具调用**：集成百度搜索、历史记录搜索
- **权限管理**：仅响应管理员私信，过滤群消息和非管理员消息
- **数据持久化**：MySQL 数据库存储聊天记录和记忆
- **代码复用**：公共函数封装，减少重复代码

## 技术栈

- **框架**: [Express](https://expressjs.com/) - Web 框架
- **AI 模型**: [豆包 Seed](https://www.volcengine.com/product/doubao) - 字节跳动大模型
- **数据库**: [MySQL2](https://github.com/sidorares/node-mysql2) - 数据库驱动
- **消息平台**: [DingTalk Stream](https://github.com/alibaba/dingtalk-stream-sdk-nodejs) - 钉钉机器人
- **定时任务**: [node-cron](https://github.com/node-cron/node-cron) - 定时任务调度
- **日期处理**: [dayjs](https://dayjs.gitee.io/) - 日期处理库
- **构建工具**: TypeScript + tsx + tsc-alias

## 项目结构

```
chat-bot/
├── src/
│   ├── api/                    # API 请求封装
│   │   ├── baiduApi.ts         # 百度搜索 API
│   │   └── request.ts          # HTTP 请求基础封装
│   ├── db/                     # 数据库相关
│   │   ├── mysql.ts            # MySQL 连接池配置
│   │   ├── record.ts           # 聊天记录数据操作
│   │   └── memory.ts           # 记忆数据操作
│   ├── routes/                 # 路由层
│   │   ├── middleware/         # 中间件
│   │   │   └── steamAuth.ts    # 开放接口认证中间件
│   │   └── open.ts             # 开放接口路由（外部系统发消息）
│   ├── services/               # 业务服务层
│   │   ├── robot.ts            # 机器人主逻辑（消息路由与调度）
│   │   ├── dingtalk/           # 钉钉机器人服务
│   │   │   ├── index.ts        # 钉钉消息监听与处理
│   │   │   └── send.ts         # 钉钉消息发送
│   │   ├── doubao/             # 豆包 AI 服务
│   │   │   ├── index.ts        # AI 对话核心逻辑
│   │   │   ├── agents/
│   │   │   │   ├── base.ts     # Agent 公共函数封装
│   │   │   │   ├── brain.ts    # 大脑 Agent（复杂处理，携带记忆和工具）
│   │   │   │   ├── neural.ts   # 中枢神经 Agent（快速判断，无记忆无工具）
│   │   │   │   ├── proactive.ts # 主动联系 Agent（智能决策是否发消息）
│   │   │   │   └── memory.ts   # 记忆生成 Agent
│   │   │   ├── prompts/
│   │   │   │   ├── common.ts   # 公共提示词（角色设定、限制事项）
│   │   │   │   ├── brain.ts    # 大脑 Agent 提示词
│   │   │   │   ├── neural.ts   # 中枢神经 Agent 提示词
│   │   │   │   ├── proactive.ts # 主动联系 Agent 提示词
│   │   │   │   └── memory.ts   # 记忆生成提示词
│   │   │   └── tools/
│   │   │       └── index.ts    # 工具函数（百度搜索、记录搜索、发起会话）
│   │   └── memory/             # 记忆服务
│   │       └── index.ts        # 记忆生成定时任务
│   ├── stores/                 # 数据缓存层
│   │   ├── record.ts           # 聊天记录内存缓存
│   │   └── memory.ts           # 记忆内存缓存
│   ├── types/                  # TypeScript 类型定义
│   │   ├── baiduApi.d.ts       # 百度 API 类型
│   │   └── common.d.ts         # 通用类型定义
│   ├── utils/                  # 工具函数
│   │   ├── delay.ts            # 延迟函数
│   │   ├── file.ts             # 文件操作
│   │   └── schedule.ts         # 定时任务封装
│   └── index.ts                # 应用入口
├── scripts/
│   └── build.js                # 构建脚本（含代码压缩）
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript 配置
└── .env.example                # 环境变量示例
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- MySQL 数据库

### 安装依赖

```bash
npm install
```

### 环境配置

复制 `.env.example` 为 `.env`，并填写配置：

```bash
cp .env.example .env
```

配置项说明：

| 变量名                   | 说明                   | 必填          |
| ------------------------ | ---------------------- | ------------- |
| `PORT`                   | 服务端口               | 否，默认 1801 |
| `OPEN_KEY`               | 开放接口密钥           | 否            |
| `DB_HOST`                | 数据库主机             | 是            |
| `DB_PORT`                | 数据库端口             | 否，默认 3306 |
| `DB_USER`                | 数据库用户名           | 是            |
| `DB_PASSWORD`            | 数据库密码             | 是            |
| `DB_NAME`                | 数据库名称             | 是            |
| `DINGTALK_CLIENT_ID`     | 钉钉应用 Client ID     | 是            |
| `DINGTALK_CLIENT_SECRET` | 钉钉应用 Client Secret | 是            |
| `DINGTALK_ADMIN_ID`      | 钉钉管理员用户 ID      | 是            |
| `DINGTALK_ADMIN_NAME`    | 钉钉管理员用户名       | 是            |
| `SEED_API_KEY`           | 豆包 Seed API 密钥     | 是            |
| `BAIDU_API_KEY`          | 百度千帆 API 密钥      | 是            |

### 数据库初始化

首次运行时会自动创建以下数据表：

**record 表（聊天记录）**

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
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
);
```

**memory 表（记忆归档）**

```sql
CREATE TABLE IF NOT EXISTS memory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(10) NOT NULL COMMENT '记忆类型：day/month/year',
  content TEXT NOT NULL COMMENT '记忆内容',
  date VARCHAR(20) NOT NULL COMMENT '对应日期',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
);
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
npm start
```

## 核心功能说明

### 1. 钉钉机器人集成

机器人仅支持管理员私聊，以下消息会被自动过滤并回复提示：

- **群消息**：回复"我暂不支持读取群消息哦~"
- **非管理员消息**：回复"我暂不支持读取非管理员消息哦~"
- **非文本消息**：回复"我暂不支持读取非文本消息哦~"

消息接收流程：

1. 接收钉钉消息推送，过滤群消息、非管理员及非文本消息
2. 将消息存入信息集合，心跳（每 2 秒）触发一次批量处理
3. 保存用户消息到数据库，转交机器人主逻辑处理

### 2. 三 Agent 消息路由

机器人主逻辑（`robot.ts`）基于消息量和内容复杂度进行智能路由：

| 条件                               | 路由目标                |
| ---------------------------------- | ----------------------- |
| 消息条数 > 5 条，或总内容 > 100 字 | 直接交大脑 Agent        |
| 其他情况                           | 先交中枢神经 Agent 判断 |

**中枢神经 Agent（`neural.ts`）**

快速、轻量处理，无记忆和工具，返回三种 action：

| action   | 含义                     |
| -------- | ------------------------ |
| `reply`  | 直接回复用户             |
| `brain`  | 转交大脑 Agent 深度处理  |
| `ignore` | 暂不回复，等待更多上下文 |

判断标准：简单问候、日常闲聊直接回复；涉及历史记忆、实时信息、复杂查询则转大脑；上下文不完整时暂不回复。

**大脑 Agent（`brain.ts`）**

携带完整历史记忆和近期聊天记录，支持工具调用，处理复杂问题。

**主动联系 Agent（`proactive.ts`）**

智能决策是否主动发起对话，根据聊天记录时间判断：

- 今天已经主动发过消息，通常选择沉默
- 深夜（22:00-8:00）不要发消息
- 沉默时间很短（几小时内），选择沉默
- 没有合适的话题或理由，选择沉默

### 3. AI 对话系统

- **角色设定**：机器人"小红帽"
- **上下文记忆**：综合历史记忆和近期聊天记录
- **工具调用**：支持百度搜索、历史记录搜索
- **结构化输出**：JSON 格式控制回复内容

### 4. 智能记忆系统

自动归档聊天记录，形成长期记忆：

| 记忆类型   | 生成时间         | 说明                               |
| ---------- | ---------------- | ---------------------------------- |
| **日记忆** | 每天凌晨 3:05    | 将前一天聊天记录总结为简洁的日记忆 |
| **月记忆** | 每月1号凌晨 3:05 | 将上月日记忆汇总为月度总结         |

记忆生成后，原始聊天记录会被标记为已归档，AI 对话时优先使用记忆内容。

### 5. 工具调用

目前集成的工具：

| 工具名                | 功能         | 触发条件               |
| --------------------- | ------------ | ---------------------- |
| `get_baidu_search`    | 百度搜索     | 询问时事热点、实时信息 |
| `search_chat_records` | 历史记录搜索 | 查找用户之前提到的信息 |

### 6. 代码复用设计

`base.ts` 封装了 Agent 公共函数：

| 函数名                | 功能                       |
| --------------------- | -------------------------- |
| `formatMemories`      | 格式化记忆列表             |
| `formatRecords`       | 格式化聊天记录（带时间）   |
| `formatRecordsSimple` | 格式化聊天记录（不带时间） |
| `createTextFormat`    | 创建 JSON Schema           |
| `parseJsonResult`     | 通用 JSON 解析器           |

### 7. 聊天记录管理

- **内存缓存**：启动时加载全部历史记录到内存
- **按用户查询**：支持私聊上下文
- **关键词搜索**：支持根据关键词搜索历史记录
- **自动持久化**：所有记录保存到 MySQL

### 8. 开放接口（外部系统发送钉钉消息）

支持外部系统通过 HTTP 接口调用发送钉钉消息。

**接口地址：** `POST /api/open/send`

**请求头：**

| 字段             | 说明         | 必填 |
| ---------------- | ------------ | ---- |
| `x-system-id`    | 系统标识     | 是   |
| `x-system-token` | 系统令牌     | 是   |
| `x-open-key`     | 开放接口密钥 | 是   |

**请求体：**

```json
{
  "msgtype": "text",
  "content": "消息内容"
}
```

**示例：**

```bash
curl -X POST http://localhost:1801/api/open/send \
  -H "Content-Type: application/json" \
  -H "x-system-id: system1" \
  -H "x-system-token: your_token" \
  -H "x-open-key: your_open_key" \
  -d '{
    "msgtype": "text",
    "content": "这是一条测试消息"
  }'
```

## 注意事项

1. **安全**：`.env` 文件包含敏感信息，请勿提交到代码仓库
2. **钉钉配置**：需要在钉钉开放平台创建企业内部应用，并开启机器人功能
3. **API 限额**：注意豆包和百度 API 的调用限额和费用
4. **数据库**：生产环境建议配置数据库连接池和定期备份
5. **记忆服务**：记忆生成依赖定时任务，请确保服务持续运行

## License

MIT
