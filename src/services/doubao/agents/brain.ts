import { chat } from "@/services/doubao";
import { BRAIN_AGENT_PROMPT } from "@/services/doubao/prompts/brain";
import { get_baidu_search, search_chat_records } from "@/services/doubao/tools";
import {
  formatMemories,
  formatRecords,
  formatRecordsSimple,
  createTextFormat,
  parseJsonResult,
} from "./base";
import type { Message, Tool } from "@/types/common";
import type { ChatRecord } from "@/db/record";
import type { Memory } from "@/db/memory";

// 结构化输出 JSON Schema
const TEXT_FORMAT = createTextFormat(
  "brain_response",
  {
    messages: {
      type: "array",
      items: { type: "string" },
      description: "大脑Agent的回复消息数组，每条消息为一个字符串",
    },
  },
  ["messages"],
);

// 解析结构化 JSON 输出
const parseMessages = (text: string): string[] => {
  const parsed = parseJsonResult<{ messages: string[] }>(
    text,
    { messages: [] },
    "brainAgent",
  );
  return parsed.messages || [];
};

// 大脑 Agent - 复杂处理，携带记忆和工具
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

  // 定义工具：百度搜索、聊天记录查询
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
        return `找到 ${results.length} 条相关聊天记录:\n${formatRecordsSimple(results)}`;
      },
    },
  ];

  const result = await chat({ messages, tools, textFormat: TEXT_FORMAT });
  return parseMessages(result);
};
