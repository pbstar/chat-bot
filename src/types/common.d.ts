// AI 消息类型
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
// AI 工具类型
export interface Tool {
  type: "function";
  name: string;
  description: string;
  parameters: object;
  handler?: (args: string) => Promise<string>;
}