import { chat } from "@/services/doubao";
import { PROACTIVE_AGENT_PROMPT } from "@/services/doubao/prompts/proactive";
import { get_baidu_search, search_chat_records } from "@/services/doubao/tools";
import {
  formatMemories,
  formatRecords,
  createTextFormat,
  parseJsonResult,
} from "./base";
import type { Message, Tool } from "@/types/common";
import type { ChatRecord } from "@/db/record";
import type { Memory } from "@/db/memory";

export interface ProactiveResult {
  action: "speak" | "silent";
  messages: string[];
}

// 结构化输出 JSON Schema
const TEXT_FORMAT = createTextFormat(
  "proactive_response",
  {
    action: {
      type: "string",
      enum: ["speak", "silent"],
      description: "speak 表示发消息，silent 表示选择不发",
    },
    messages: {
      type: "array",
      items: { type: "string" },
      description: "action 为 speak 时填写消息内容，silent 时填空数组",
    },
  },
  ["action", "messages"],
);

// 解析结构化输出
const parseResult = (text: string): ProactiveResult => {
  const parsed = parseJsonResult<{ action: string; messages: string[] }>(
    text,
    { action: "silent", messages: [] },
    "proactiveAgent",
  );
  return {
    action: parsed.action === "silent" ? "silent" : "speak",
    messages: parsed.messages || [],
  };
};

// 主动联系 Agent
export const proactiveAgent = async (
  dayTime: string,
  records: ChatRecord[],
  memories: Memory[],
): Promise<ProactiveResult> => {
  const messages: Message[] = [
    { role: "system", content: PROACTIVE_AGENT_PROMPT },
    {
      role: "user",
      content: [
        `【当前时间】${dayTime}`,
        `【历史记忆】\n${formatMemories(memories)}`,
        `【近期聊天记录】\n${formatRecords(records)}`,
      ].join("\n\n"),
    },
  ];

  const tools: Tool[] = [
    {
      type: "function",
      name: "get_baidu_search",
      description:
        "根据关键词进行百度搜索，获取今日热点新闻或最新资讯。想分享新鲜内容时使用",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "搜索关键词" },
        },
        required: ["query"],
      },
      handler: async (args: string) => {
        const { query } = JSON.parse(args) as { query: string };
        const results = await get_baidu_search(query);
        return `搜索结果\n${results.map((n) => ` - ${n.content} ${n.time} ${n.source}`).join("\n")}`;
      },
    },
    {
      type: "function",
      name: "search_chat_records",
      description:
        "根据关键词搜索历史聊天记录，用于找到以前聊过的话题作为切入点",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "搜索关键词" },
        },
        required: ["keyword"],
      },
      handler: async (args: string) => {
        const { keyword } = JSON.parse(args) as { keyword: string };
        const results = search_chat_records(keyword);
        if (results.length === 0) return "未找到相关聊天记录";
        return `找到 ${results.length} 条相关聊天记录:\n${formatRecords(results)}`;
      },
    },
  ];

  const result = await chat({ messages, tools, textFormat: TEXT_FORMAT });
  return parseResult(result);
};
