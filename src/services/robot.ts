import { initDingtalk } from "@/services/dingtalk";
import { initMemory } from "@/services/memory";
import { getAllChatRecords } from "@/db/record";
import createRecordStore from "@/stores/record";
import dayjs from "dayjs";

interface Info {
  type: string;
  content: string;
  createdAt: string;
}

const recordStore = createRecordStore();

// 大脑处理
const handleBrain = (info: Set<Info>) => {
  console.log("[机器人] 大脑处理:", info);
};
// 中枢神经处理
const handleNeural = (info: Set<Info>) => {
  console.log("[机器人] 中枢神经处理:", info);
};

export const initRobot = () => {
  // 信息集合
  const info = new Set<Info>();
  // 初始化聊天记录
  getAllChatRecords().then((records) => {
    recordStore.init(records);
    console.log(`初始化聊天记录缓存完成，共加载 ${records.length} 条记录`);
  });
  // 初始化记忆
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
  setInterval(() => {
    console.log("[机器人] 心跳");
    if (info.size == 0) return;
    const infoTextSize = Array.from(info).reduce(
      (acc, curr) => acc + curr.content.length,
      0,
    );
    // 如果信息大于5条或者内容超过100字，则直接进行大脑处理，否则进行中枢神经处理
    if (info.size > 5 || infoTextSize > 100) {
      handleBrain(info);
    } else {
      handleNeural(info);
    }
  }, 1000);
};
