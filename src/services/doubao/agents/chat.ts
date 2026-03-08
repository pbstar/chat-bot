import { chat } from "@/services/doubao";
import { CHAT_AGENT_PROMPT } from "@/services/doubao/prompts/chat";
import { get_baidu_search } from "@/services/doubao/tools";
import type { Message, Tool } from "@/types/common";
import type { ChatRecord } from "@/db/record";

// 闲聊 Agent
export const chatAgent = async (
  content: string,
  records: ChatRecord[],
): Promise<string[]> => {
  let recordsContent = "";
  if (records) {
    for (const record of records) {
      if (record.type === "user") {
        // 群聊显示用户名，私聊显示"用户"
        const userLabel =
          record.groupId && record.userName ? record.userName : "用户";
        recordsContent += `${userLabel}：`;
      } else {
        recordsContent += "AI：";
      }
      recordsContent += record.content + "\n";
    }
  }
  const messages: Message[] = [
    { role: "system", content: CHAT_AGENT_PROMPT },
    {
      role: "user",
      content: `【用户提问】\n${content}\n\n【历史聊天记录】\n${recordsContent}`,
    },
  ];

  // 定义工具：百度搜索
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
        const { query } = JSON.parse(args);
        const results = await get_baidu_search(query);
        let text = "搜索结果\n";
        text += " - 内容 时间 来源\n";
        text += results
          .map((n) => ` - ${n.content} ${n.time} ${n.source}`)
          .join("\n");
        return text;
      },
    },
  ];

  const result = await chat({ messages, tools });
  return result;
};
