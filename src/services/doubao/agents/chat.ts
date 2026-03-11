import { chat } from "@/services/doubao";
import { CHAT_AGENT_PROMPT } from "@/services/doubao/prompts/chat";
import {
  get_baidu_search,
  search_chat_records,
  speak_to_user,
} from "@/services/doubao/tools";
import type { Message, Tool } from "@/types/common";
import type { ChatRecord } from "@/db/record";
import type { Memory } from "@/db/memory";

// 结构化输出 JSON Schema
const TEXT_FORMAT = {
  type: "json_schema",
  name: "chat_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: { type: "string" },
        description: "聊天机器人的回复消息数组，每条消息为一个字符串",
      },
    },
    required: ["messages"],
  },
};

// 解析结构化 JSON 输出
const parseMessages = (text: string): string[] => {
  try {
    const parsed = JSON.parse(text) as { messages: string[] };
    return parsed.messages || [];
  } catch {
    console.error("[chatAgent] 解析结构化输出失败:", text);
    return [];
  }
};

// 格式化记忆列表为文本
const formatMemories = (memories: Memory[]): string => {
  if (memories.length === 0) return "（暂无记忆）";
  return memories.map((m) => `【${m.date}】${m.content}`).join("\n");
};

// 格式化聊天记录为文本
const formatRecords = (records: ChatRecord[]): string => {
  if (records.length === 0) return "（暂无记录）";
  return records
    .map((r) => {
      const label =
        r.type === "user"
          ? r.groupId && r.userName
            ? r.userName
            : "用户"
          : "AI";
      return `${label}：${r.content}`;
    })
    .join("\n");
};

// 闲聊 Agent
export const chatAgent = async (
  content: string,
  records: ChatRecord[],
  memories: Memory[],
): Promise<string[]> => {
  const messages: Message[] = [
    { role: "system", content: CHAT_AGENT_PROMPT },
    {
      role: "user",
      content: [
        `【用户提问】\n${content}`,
        `【历史记忆】\n${formatMemories(memories)}`,
        `【近期聊天记录】\n${formatRecords(records)}`,
      ].join("\n\n"),
    },
  ];

  // 定义工具：百度搜索、聊天记录查询、发起会话
  const tools: Tool[] = [
    {
      type: "function",
      name: "get_baidu_search",
      description:
        "根据关键词进行百度搜索，获取最新的相关信息。当用户询问时事热点、某个话题的最新动态、需要实时信息的话题等时使用",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词",
          },
        },
        required: ["query"],
      },
      handler: async (args: string) => {
        const { query } = JSON.parse(args) as { query: string };
        const results = await get_baidu_search(query);
        let text = "搜索结果\n";
        text += " - 内容 时间 来源\n";
        text += results
          .map((n) => ` - ${n.content} ${n.time} ${n.source}`)
          .join("\n");
        return text;
      },
    },
    {
      type: "function",
      name: "search_chat_records",
      description:
        "根据关键词搜索历史聊天记录，用于查找用户之前提到过的信息或回顾对话历史。当用户询问之前说过什么、查找历史信息、回顾某个话题时使用",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "搜索关键词",
          },
        },
        required: ["keyword"],
      },
      handler: async (args: string) => {
        const { keyword } = JSON.parse(args) as { keyword: string };
        const results = search_chat_records(keyword);
        if (results.length === 0) {
          return "未找到相关聊天记录";
        }
        let text = `找到 ${results.length} 条相关聊天记录:\n`;
        text += results
          .map((r) => {
            const label =
              r.type === "user"
                ? r.groupId && r.userName
                  ? r.userName
                  : "用户"
                : "AI";
            return `${label}：${r.content}`;
          })
          .join("\n");
        return text;
      },
    },
    {
      type: "function",
      name: "speak_to_user",
      description:
        "发起会话，用于让AI主动发起对话。当用户说“五分钟后提醒我做某事”之类的要求时使用，请根据用户要求设置延迟时间",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "会话内容",
          },
          delay_ms: {
            type: "number",
            description: "延迟时间（毫秒）",
          },
        },
        required: ["message", "delay_ms"],
      },
      handler: async (args: string) => {
        const { message, delay_ms } = JSON.parse(args) as {
          message: string;
          delay_ms: number;
        };
        speak_to_user(message, delay_ms);
        return "会话已发起";
      },
    },
  ];

  const result = await chat({ messages, tools, textFormat: TEXT_FORMAT });
  return parseMessages(result);
};
