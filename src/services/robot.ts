import { initDingtalk } from "@/services/dingtalk";
import { initMemory } from "@/services/memory";
import { getAllChatRecords } from "@/db/record";
import createRecordStore from "@/stores/record";
import createMemoryStore from "@/stores/memory";
import { brainAgent } from "@/services/doubao/agents/brain";
import { neuralAgent } from "@/services/doubao/agents/neural";
import { proactiveAgent } from "@/services/doubao/agents/proactive";
import { send } from "@/services/dingtalk/send";
import { addChatRecord } from "@/db/record";
import dayjs, { type Dayjs } from "dayjs";

type InfoType = "message" | "pending";

interface Info {
  type: InfoType;
  content: string;
  createdAt: string;
}

const recordStore = createRecordStore();
const memoryStore = createMemoryStore();

// 从环境变量获取管理员ID
const ADMIN_ID = process.env.DINGTALK_ADMIN_ID || "";
const ADMIN_NAME = process.env.DINGTALK_ADMIN_NAME || "";

// 最近一次双向沟通时间（用户发消息 / AI 被动回复 / AI 主动发消息 均算）
let lastActivityAt: Dayjs | null = null;
// 下次执行主动联系检查的时间（初始立即检查）
let nextProactiveCheckAt: Dayjs = dayjs();

// 主动联系仅在此时间段内触发（小时）
const PROACTIVE_HOUR_START = 9;
const PROACTIVE_HOUR_END = 22;
// 沉默超过此小时数触发主动联系检查
const PROACTIVE_SILENCE_HOURS = 2;

// 生成随机检查间隔（20~50 分钟）
const randomCheckInterval = () =>
  Math.floor(Math.random() * 30 + 20) * 60 * 1000;

// 发送消息和记录到数据库（AI 发消息时更新最近活跃时间）
const sendMessageAndRecord = (message: string) => {
  send({ msgtype: "text", content: message });
  addChatRecord({
    userId: ADMIN_ID,
    userName: ADMIN_NAME,
    groupId: "",
    groupName: "",
    content: message,
    type: "ai",
  });
  lastActivityAt = dayjs();
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

// 中枢神经处理 - 快速处理，携带近期上下文，无工具
// 如果判断需要大脑处理，则转交大脑
const handleNeural = async (content: string, infoSet: Set<Info>) => {
  console.log("[机器人] 中枢神经处理:", content);

  const records = recordStore.getByUserId(ADMIN_ID);

  try {
    const result = await neuralAgent(content, records);

    if (result.action === "brain") {
      console.log("[机器人] 中枢神经判断需要大脑处理，转交中...");
      await handleBrain(content);
    } else if (result.action === "reply") {
      console.log("[机器人] 中枢神经回复:", result.messages);
      // TODO: 发送回复给用户
      result.messages.forEach((message) => sendMessageAndRecord(message));
    } else {
      console.log("[机器人] 中枢神经判断暂不回复，继续等待上下文...");
      // 标记为待处理，等待后续消息拼接
      infoSet.add({
        type: "pending",
        content,
        createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      });
    }
  } catch (error) {
    console.error("[机器人] 中枢神经处理失败:", error);
  }
};

// 处理信息
const handleInfo = (info: Info[], infoSet: Set<Info>) => {
  const newInfoLength = info.filter((item) => item.type === "message").length;
  const content = info.map((i) => i.content).join("\n");
  if (newInfoLength === 0) return;
  // 如果信息大于5条或者内容超过100字，则直接进行大脑处理，否则进行中枢神经处理
  if (newInfoLength > 5 || content.length > 100) {
    handleBrain(content);
  } else {
    handleNeural(content, infoSet);
  }
};

// 检查并触发主动联系
const checkProactive = async () => {
  const now = dayjs();
  const hour = now.hour();

  // 只在合理时间段内主动联系
  if (hour < PROACTIVE_HOUR_START || hour >= PROACTIVE_HOUR_END) return;

  const hoursSinceActivity = lastActivityAt
    ? now.diff(lastActivityAt, "hour")
    : Infinity;
  if (hoursSinceActivity < PROACTIVE_SILENCE_HOURS) return;

  const reason =
    hoursSinceActivity === Infinity
      ? "从未有过任何沟通记录"
      : `已有 ${hoursSinceActivity} 小时没有任何沟通了`;

  console.log("[机器人] 触发主动联系，原因:", reason);

  const records = recordStore.getByUserId(ADMIN_ID);
  const memories = memoryStore.getAll();

  try {
    const result = await proactiveAgent(reason, records, memories);
    if (result.action === "silent") {
      console.log("[机器人] 主动联系：选择沉默");
      return;
    }
    if (result.messages.length === 0) return;
    console.log("[机器人] 主动联系内容:", result.messages);
    result.messages.forEach((msg) => sendMessageAndRecord(msg));
  } catch (error) {
    console.error("[机器人] 主动联系失败:", error);
  }
};

export const initRobot = async () => {
  // 信息集合
  const info = new Set<Info>();

  // 初始化聊天记录
  const records = await getAllChatRecords();
  recordStore.init(records);

  // 从最近一条记录（任意类型）初始化最近活跃时间
  const latestRecord = records
    .filter((r) => r.userId === ADMIN_ID)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  if (latestRecord) {
    lastActivityAt = dayjs(latestRecord.createdAt);
    console.log(
      "[机器人] 最近活跃时间:",
      lastActivityAt.format("YYYY-MM-DD HH:mm:ss"),
    );
  }

  // 启动记忆服务
  initMemory();

  // 初始化钉钉机器人
  initDingtalk((message: string) => {
    console.log("[机器人] 听到:", message);
    lastActivityAt = dayjs();
    info.add({
      type: "message",
      content: message,
      createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
  });

  // 心跳机制
  setInterval(async () => {
    // 处理消息队列
    if (info.size > 0) {
      handleInfo(Array.from(info), info);
      info.clear();
    }
    // 主动联系检查（随机间隔 30~90 分钟）
    if (dayjs().isAfter(nextProactiveCheckAt)) {
      nextProactiveCheckAt = dayjs().add(randomCheckInterval(), "ms");
      checkProactive();
    }
  }, 2000);
};
