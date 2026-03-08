import { post } from "@/api/request";
import type { Message, Tool } from "@/types/common";

interface OutputItem {
  type: string;
  content?: Array<{ type: string; text: string }>;
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: string;
}

interface ResponsesResponse {
  id: string;
  output: OutputItem[];
}

// 结构化输出格式
interface TextFormat {
  type: "json_schema";
  name: string;
  strict: boolean;
  schema: {
    type: "object";
    properties: {
      messages: {
        type: "array";
        items: { type: "string" };
        description: string;
      };
    };
    required: string[];
  };
}

interface StructuredOutput {
  messages: string[];
}

const SEED_URL = "https://ark.cn-beijing.volces.com/api/v3/responses";

const getHeaders = (): Record<string, string> => {
  const apiKey = process.env.SEED_API_KEY;
  if (!apiKey) throw new Error("SEED_API_KEY 未配置");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
};

// 结构化输出的 JSON Schema 定义
const getStructuredOutputFormat = (): TextFormat => ({
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
});

// 从结构化输出中提取 messages 数组
const extractMessages = (output: OutputItem[]): string[] => {
  const message = output.find((o) => o.type === "message");
  const jsonText =
    message?.content?.find((c) => c.type === "output_text")?.text ?? "{}";
  try {
    const parsed: StructuredOutput = JSON.parse(jsonText);
    return parsed.messages || [];
  } catch {
    console.error("[AI调用] 解析结构化输出失败:", jsonText);
    return [];
  }
};

// 执行工具调用
const executeTools = async (
  toolCalls: OutputItem[],
  toolHandlerMap: Map<string, (args: string) => Promise<string>>,
): Promise<OutputItem[]> => {
  console.log("[AI调用] 开始执行工具，数量:", toolCalls.length);
  const outputs = await Promise.all(
    toolCalls.map(async (call) => {
      const handler = toolHandlerMap.get(call.name ?? "");
      const output = handler
        ? await handler(call.arguments ?? "")
        : `未找到工具 ${call.name} 的处理函数`;
      console.log(
        `[AI调用] 工具执行完成: ${call.name}, 结果长度:`,
        output.length,
      );
      return {
        type: "function_call_output" as const,
        call_id: call.call_id,
        output,
      };
    }),
  );
  return outputs;
};

const MAX_TOOL_ROUNDS = 5;

// 记录工具调用日志
const logToolCalls = (toolCalls: OutputItem[], depth: number): void => {
  console.log(`[AI调用] 第${depth}轮工具调用数:`, toolCalls.length);
  toolCalls.forEach((call, idx) => {
    console.log(
      `[AI调用] 第${depth}轮工具${idx + 1}: ${call.name}, 参数:`,
      call.arguments,
    );
  });
};

// 处理AI响应
const handleResponse = async (
  result: ResponsesResponse,
  toolHandlerMap: Map<string, (args: string) => Promise<string>>,
  depth: number,
): Promise<string[]> => {
  const toolCalls = result.output.filter((o) => o.type === "function_call");
  logToolCalls(toolCalls, depth);

  // 无工具调用，直接返回
  if (toolCalls.length === 0 || toolHandlerMap.size === 0) {
    console.log(`[AI调用] 第${depth}轮无工具调用，返回结果`);
    return extractMessages(result.output);
  }

  // 超过最大轮数
  if (depth >= MAX_TOOL_ROUNDS) {
    console.log(`[AI调用] 警告: 已达到最大工具调用轮数(${MAX_TOOL_ROUNDS})`);
    const content = extractMessages(result.output);
    return content.length > 0 ? content : ["工具调用次数过多，请简化您的问题"];
  }

  // 执行工具并递归
  const toolOutputs = await executeTools(toolCalls, toolHandlerMap);
  return chatWithTools(result.id, toolOutputs, toolHandlerMap, depth + 1);
};

// 递归调用AI
const chatWithTools = async (
  previousResponseId: string,
  toolOutputs: OutputItem[],
  toolHandlerMap: Map<string, (args: string) => Promise<string>>,
  depth: number,
): Promise<string[]> => {
  console.log(`[AI调用] 第${depth}轮请求开始...`);

  const result = await post<ResponsesResponse>(
    SEED_URL,
    {
      model: "doubao-seed-2-0-lite-260215",
      previous_response_id: previousResponseId,
      input: toolOutputs,
    },
    { headers: getHeaders() },
  );
  console.log(`[AI调用] 第${depth}轮响应完成，responseId:`, result.id);

  return handleResponse(result, toolHandlerMap, depth);
};

// 主聊天函数 - 返回 string[]
export const chat = async (data: {
  messages: Message[];
  tools?: Tool[];
}): Promise<string[]> => {
  const { messages, tools } = data;

  // 构建工具映射
  const toolHandlerMap = new Map<string, (args: string) => Promise<string>>();
  const apiTools: Tool[] = [];

  if (tools) {
    for (const tool of tools) {
      apiTools.push({
        type: tool.type,
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      });
      if (tool.handler) {
        toolHandlerMap.set(tool.name, tool.handler);
      }
    }
  }

  // 第一轮调用
  console.log("[AI调用] 第一轮请求开始，工具数:", apiTools.length);
  const result = await post<ResponsesResponse>(
    SEED_URL,
    {
      model: "doubao-seed-2-0-lite-260215",
      input: messages,
      tools: apiTools,
      text: { format: getStructuredOutputFormat() },
    },
    { headers: getHeaders() },
  );

  return handleResponse(result, toolHandlerMap, 1);
};

export type { Message };
