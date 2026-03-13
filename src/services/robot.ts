import { initDingtalk } from "@/services/dingtalk";
import { initMemory } from "@/services/memory";
import { getAllChatRecords } from "@/db/record";
import createRecordStore from "@/stores/record";
import createMemoryStore from "@/stores/memory";
import { brainAgent } from "@/services/doubao/agents/brain";
import { neuralAgent } from "@/services/doubao/agents/neural";
import { send } from "@/services/dingtalk/send";
import { addChatRecord } from "@/db/record";
import dayjs from "dayjs";

interface Info {
  type: string;
  content: string;
  createdAt: string;
}

const recordStore = createRecordStore();
const memoryStore = createMemoryStore();

// 从环境变量获取管理员ID
const ADMIN_ID = process.env.DINGTALK_ADMIN_ID || "";

// 发送消息和记录到数据库
const sendMessageAndRecord = (message: string) => {
  send({ msgtype: "text", content: message });
  addChatRecord({
    userId: ADMIN_ID,
    userName: "彭勃",
    groupId: "",
    groupName: "",
    content: message,
    type: "ai",
  });
};

// 大脑处理 - 复杂处理，携带记忆和工具
const handleBrain = async (content: string) => {
  console.log("[机器人] 大脑处理:", content);

  const records = recordStore.getByUserId(ADMIN_ID);
  const memories = memoryStore.getAll();

  try {
    const responses = await brainAgent(content, records, memories);
    console.log("[机器人] 大脑回复:", responses);
    // TODO: 发送回复给用户
    responses.forEach((response) => sendMessageAndRecord(response));
  } catch (error) {
    console.error("[机器人] 大脑处理失败:", error);
  }
};

// 中枢神经处理 - 简单快速处理，无记忆和工具
// 如果判断需要大脑处理，则转交大脑
const handleNeural = async (content: string) => {
  console.log("[机器人] 中枢神经处理:", content);

  try {
    const result = await neuralAgent(content);

    if (result.needBrain) {
      console.log("[机器人] 中枢神经判断需要大脑处理，转交中...");
      await handleBrain(content);
    } else {
      console.log("[机器人] 中枢神经回复:", result.messages);
      // TODO: 发送回复给用户
      result.messages.forEach((message) => sendMessageAndRecord(message));
    }
  } catch (error) {
    console.error("[机器人] 中枢神经处理失败:", error);
  }
};

// 处理信息
const handleInfo = (info: Info[]) => {
  const infoTextSize = info.reduce((acc, curr) => acc + curr.content.length, 0);
  const content = info.map((i) => i.content).join("\n");
  // 如果信息大于5条或者内容超过100字，则直接进行大脑处理，否则进行中枢神经处理
  if (info.length > 5 || infoTextSize > 100) {
    handleBrain(content);
  } else {
    handleNeural(content);
  }
};

export const initRobot = async () => {
  // 信息集合
  const info = new Set<Info>();

  // 初始化聊天记录
  const records = await getAllChatRecords();
  recordStore.init(records);

  // 启动记忆服务
  initMemory();

  // 初始化钉钉机器人
  initDingtalk((message: string) => {
    console.log("[机器人] 听到:", message);
    info.add({
      type: "message",
      content: message,
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
  });

  // 心跳机制
  setInterval(async () => {
    if (info.size == 0) return;
    handleInfo(Array.from(info));
    info.clear();
  }, 2000);
};
