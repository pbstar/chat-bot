# Chat Bot - 智能聊天机器人

基于 AI 大模型的聊天机器人，支持钉钉机器人集成，具备智能对话、历史记录管理、百度搜索等功能。

## 功能特性

- **智能对话**：基于豆包 Seed 大模型的自然语言对话能力
- **钉钉集成**：支持钉钉机器人私聊和群聊场景
- **历史记录**：自动保存聊天记录，支持上下文对话
- **工具调用**：集成百度搜索，支持实时信息查询
- **权限管理**：支持管理员私信过滤和群聊白名单
- **数据持久化**：MySQL 数据库存储聊天记录

## 技术栈

- **框架**: [Express](https://expressjs.com/) - Web 框架
- **AI 模型**: [豆包 Seed](https://www.volcengine.com/product/doubao) - 字节跳动大模型
- **数据库**: [MySQL2](https://github.com/sidorares/node-mysql2) - 数据库驱动
- **消息平台**: [DingTalk Stream](https://github.com/alibaba/dingtalk-stream-sdk-nodejs) - 钉钉机器人
- **定时任务**: [node-cron](https://github.com/node-cron/node-cron) - 定时任务调度
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
│   │   └── record.ts           # 聊天记录数据操作
│   ├── routes/                 # 路由层
│   │   ├── middleware/         # 中间件
│   │   │   └── steamAuth.ts    # 开放接口认证中间件
│   │   ├── dingtalk.ts         # 钉钉消息路由
│   │   └── open.ts             # 开放接口路由（外部系统发消息）
│   ├── services/               # 业务服务层
│   │   ├── dingtalk/           # 钉钉机器人服务
│   │   │   ├── index.ts        # 钉钉消息监听与处理
│   │   │   └── send.ts         # 钉钉消息发送
│   │   └── doubao/             # 豆包 AI 服务
│   │       ├── index.ts        # AI 对话核心逻辑
│   │       ├── agents/
│   │       │   └── chat.ts     # 闲聊 Agent
│   │       ├── prompts/
│   │       │   └── chat.ts     # 角色提示词
│   │       └── tools/
│   │           └── index.ts    # 工具函数（百度搜索）
│   ├── stores/                 # 数据缓存层
│   │   └── record.ts           # 聊天记录内存缓存
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
| `SEED_API_KEY`           | 豆包 Seed API 密钥     | 是            |
| `BAIDU_API_KEY`          | 百度千帆 API 密钥      | 是            |

### 数据库初始化

首次运行时会自动创建 `record` 表，表结构如下：

```sql
CREATE TABLE IF NOT EXISTS record (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(100) COMMENT '用户ID',
  groupId VARCHAR(100) COMMENT '群组ID',
  userName VARCHAR(100) COMMENT '用户名',
  groupName VARCHAR(200) COMMENT '群组名',
  content TEXT NOT NULL COMMENT '聊天内容',
  type VARCHAR(10) NOT NULL COMMENT '消息类型：user-用户消息，ai-AI消息',
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

机器人支持两种交互场景：

- **私聊模式**：仅响应管理员私信，其他用户会收到提示
- **群聊模式**：响应所有群消息，支持上下文对话

消息处理流程：

1. 接收钉钉消息推送
2. 过滤非文本消息
3. 查询历史聊天记录（最近 24 小时）
4. 调用 AI Agent 生成回复
5. 分段发送回复消息
6. 保存对话记录到数据库

### 2. AI 对话系统

基于豆包 Seed 模型的多轮对话系统：

- **角色设定**：初辰科技机器人"小红帽"
- **上下文记忆**：自动关联最近 24 小时对话记录
- **工具调用**：支持百度搜索获取实时信息
- **结构化输出**：JSON 格式控制回复内容

### 3. 工具调用

目前集成的工具：

| 工具名             | 功能     | 触发条件               |
| ------------------ | -------- | ---------------------- |
| `get_baidu_search` | 百度搜索 | 询问时事热点、实时信息 |

### 4. 聊天记录管理

- **内存缓存**：启动时加载全部历史记录到内存
- **按用户查询**：支持私聊上下文
- **按群组查询**：支持群聊上下文
- **自动持久化**：所有记录保存到 MySQL

### 5. 开放接口（外部系统发送钉钉消息）

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
  "msgtype": "text", // 消息类型：text 或 markdown
  "content": "消息内容" // 消息内容
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

**环境变量配置：**

```bash
# 开放接口密钥
OPEN_KEY=your_open_key_here
```

**认证说明：**

- `x-open-key` 必须匹配环境变量 `OPEN_KEY`
- `x-system-id` 和 `x-system-token` 预留用于后续扩展校验

## 注意事项

1. **安全**：`.env` 文件包含敏感信息，请勿提交到代码仓库
2. **钉钉配置**：需要在钉钉开放平台创建企业内部应用，并开启机器人功能
3. **API 限额**：注意豆包和百度 API 的调用限额和费用
4. **数据库**：生产环境建议配置数据库连接池和定期备份

## License

MIT
