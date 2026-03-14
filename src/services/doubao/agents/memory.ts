import { chat } from "@/services/doubao";
import {
  DAY_MEMORY_PROMPT,
  MONTH_MEMORY_PROMPT,
} from "@/services/doubao/prompts/memory";
import { formatMemories, formatRecordsSimple } from "./base";
import type { Message } from "@/types/common";
import type { ChatRecord } from "@/db/record";
import type { Memory } from "@/db/memory";

// 日记忆生成 Agent
export const dayMemoryAgent = async (
  records: ChatRecord[],
): Promise<string> => {
  const messages: Message[] = [
    { role: "system", content: DAY_MEMORY_PROMPT },
    { role: "user", content: `【聊天记录】\n${formatRecordsSimple(records)}` },
  ];
  return chat({ messages });
};

// 月记忆生成 Agent
export const monthMemoryAgent = async (memories: Memory[]): Promise<string> => {
  const messages: Message[] = [
    { role: "system", content: MONTH_MEMORY_PROMPT },
    { role: "user", content: `【日记忆列表】\n${formatMemories(memories)}` },
  ];
  return chat({ messages });
};
