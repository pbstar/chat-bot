import type { ChatRecord } from "@/db/record";
import type { Memory } from "@/db/memory";

// 格式化记忆列表为文本
export const formatMemories = (memories: Memory[]): string => {
  if (memories.length === 0) return "（暂无记忆）";
  return memories.map((m) => `【${m.date}】${m.content}`).join("\n");
};

// 格式化聊天记录为文本（带时间）
export const formatRecords = (records: ChatRecord[]): string => {
  if (records.length === 0) return "（暂无记录）";
  return records
    .map((r) => {
      const label = r.type === "user" ? "用户" : "AI";
      return `[${r.createdAt}] ${label}：${r.content}`;
    })
    .join("\n");
};

// 格式化聊天记录为文本（不带时间，用于工具返回）
export const formatRecordsSimple = (records: ChatRecord[]): string => {
  if (records.length === 0) return "（暂无记录）";
  return records
    .map((r) => {
      const label = r.type === "user" ? "用户" : "AI";
      return `${label}：${r.content}`;
    })
    .join("\n");
};

// 通用的 JSON Schema 定义生成器
export const createTextFormat = <T extends string>(
  name: string,
  properties: Record<string, unknown>,
  required: string[],
) => ({
  type: "json_schema" as const,
  name,
  strict: true,
  schema: {
    type: "object" as const,
    properties,
    required,
  },
});

// 通用的 JSON 解析器
export const parseJsonResult = <T>(
  text: string,
  defaultValue: T,
  errorPrefix: string,
): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error(`[${errorPrefix}] 解析结构化输出失败:`, text);
    return defaultValue;
  }
};
