import { chat } from "@/services/doubao";
import { NEURAL_AGENT_PROMPT } from "@/services/doubao/prompts/neural";
import type { Message } from "@/types/common";

export type NeuralAction = "brain" | "reply" | "ignore";

// 神经Agent返回结果
export interface NeuralResult {
  action: NeuralAction;
  messages: string[];
}

// 结构化输出 JSON Schema
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
        description:
          "处理动作，brain表示转交大脑，reply表示直接回复，ignore表示暂不回复",
      },
      messages: {
        type: "array",
        items: { type: "string" },
        description: "Agent的回复消息数组，每条消息为一个字符串",
      },
    },
    required: ["action", "messages"],
  },
};

// 解析结构化 JSON 输出
const parseResult = (text: string): NeuralResult => {
  try {
    const parsed = JSON.parse(text) as NeuralResult;
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
  } catch {
    console.error("[neuralAgent] 解析结构化输出失败:", text);
    return { action: "brain", messages: [] };
  }
};

// 中枢神经 Agent - 简单快速处理，无记忆和工具
export const neuralAgent = async (content: string): Promise<NeuralResult> => {
  const messages: Message[] = [
    { role: "system", content: NEURAL_AGENT_PROMPT },
    {
      role: "user",
      content: `【用户提问】\n${content}`,
    },
  ];

  const result = await chat({ messages, textFormat: TEXT_FORMAT });
  return parseResult(result);
};
