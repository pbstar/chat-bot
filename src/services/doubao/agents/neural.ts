import { chat } from "@/services/doubao";
import { NEURAL_AGENT_PROMPT } from "@/services/doubao/prompts/neural";
import { formatRecords, createTextFormat, parseJsonResult } from "./base";
import type { Message } from "@/types/common";
import type { ChatRecord } from "@/db/record";

export type NeuralAction = "brain" | "reply" | "ignore";

// 神经Agent返回结果
export interface NeuralResult {
  action: NeuralAction;
  messages: string[];
}

// 结构化输出 JSON Schema
const TEXT_FORMAT = createTextFormat(
  "neural_response",
  {
    action: {
      type: "string",
      enum: ["brain", "reply", "ignore"],
      description:
        "处理动作，brain表示转交大脑，reply表示直接回复，ignore表示暂不回复",
    },
    messages: {
      type: "array",
      items: { type: "string" },
      description: "Agent的回复消息数组，每条消息为一个字符串",
    },
  },
  ["action", "messages"],
);

// 解析结构化 JSON 输出
const parseResult = (text: string): NeuralResult => {
  const parsed = parseJsonResult<{ action: string; messages: string[] }>(
    text,
    { action: "brain", messages: [] },
    "neuralAgent",
  );

  const action: NeuralAction =
    parsed.action === "brain" ||
    parsed.action === "reply" ||
    parsed.action === "ignore"
      ? parsed.action
      : "brain";

  return {
    action,
    messages: parsed.messages || [],
  };
};

// 中枢神经 Agent - 快速处理，仅携带近期上下文，无记忆，无工具
export const neuralAgent = async (
  content: string,
  records: ChatRecord[] = [],
): Promise<NeuralResult> => {
  // 只取最近 8 条记录，避免上下文过长
  const recentRecords = records.slice(-8);

  const messages: Message[] = [
    { role: "system", content: NEURAL_AGENT_PROMPT },
    {
      role: "user",
      content: [
        `【近期聊天记录】\n${formatRecords(recentRecords)}`,
        `【用户提问】\n${content}`,
      ].join("\n\n"),
    },
  ];

  const result = await chat({ messages, textFormat: TEXT_FORMAT });
  return parseResult(result);
};
