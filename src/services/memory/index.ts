import dayjs from "dayjs";
import { createSchedule } from "@/utils/schedule";
import {
  createMemoryTable,
  addMemory,
  getAllMemories,
  getDayMemoriesForMonth,
  deleteMemoriesByIds,
} from "@/db/memory";
import {
  createRecordTable,
  getUnmemorizedRecordsByDate,
  markRecordsAsMemorized,
} from "@/db/record";
import {
  dayMemoryAgent,
  monthMemoryAgent,
} from "@/services/doubao/agents/memory";
import createMemoryStore from "@/stores/memory";
import createRecordStore from "@/stores/record";

const memoryStore = createMemoryStore();
const recordStore = createRecordStore();

// 生成昨天的日记忆
const generateDayMemory = async (): Promise<void> => {
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const records = await getUnmemorizedRecordsByDate(yesterday);

  if (records.length === 0) {
    console.log(`[记忆服务] ${yesterday} 无未归档的聊天记录，跳过`);
    return;
  }

  console.log(
    `[记忆服务] 开始生成 ${yesterday} 日记忆，共 ${records.length} 条记录`,
  );
  const content = await dayMemoryAgent(records);

  if (!content) {
    console.warn(`[记忆服务] ${yesterday} 日记忆生成内容为空，跳过`);
    return;
  }

  const id = await addMemory({ type: "day", content, date: yesterday });
  const ids = records.map((r) => r.id);
  await markRecordsAsMemorized(ids);

  // 同步更新缓存
  memoryStore.add({
    id,
    type: "day",
    content,
    date: yesterday,
    createdAt: new Date(),
  });
  recordStore.markAsMemorized(ids);

  console.log(`[记忆服务] ${yesterday} 日记忆生成完成`);
};

// 生成上个月的月记忆
const generateMonthMemory = async (): Promise<void> => {
  const lastMonth = dayjs().subtract(1, "month").format("YYYY-MM");
  const dayMemories = await getDayMemoriesForMonth(lastMonth);

  if (dayMemories.length === 0) {
    console.log(`[记忆服务] ${lastMonth} 无日记忆，跳过月记忆生成`);
    return;
  }

  console.log(
    `[记忆服务] 开始生成 ${lastMonth} 月记忆，共 ${dayMemories.length} 条日记忆`,
  );
  const content = await monthMemoryAgent(dayMemories);

  if (!content) {
    console.warn(`[记忆服务] ${lastMonth} 月记忆生成内容为空，跳过`);
    return;
  }

  const id = await addMemory({ type: "month", content, date: lastMonth });
  const ids = dayMemories.map((m) => m.id);
  await deleteMemoriesByIds(ids);

  // 同步更新缓存
  memoryStore.add({
    id,
    type: "month",
    content,
    date: lastMonth,
    createdAt: new Date(),
  });
  memoryStore.removeByIds(ids);

  console.log(
    `[记忆服务] ${lastMonth} 月记忆生成完成，已删除 ${dayMemories.length} 条日记忆`,
  );
};

// 初始化记忆服务
export async function initMemory(): Promise<void> {
  await createRecordTable();
  await createMemoryTable();

  // 加载记忆缓存
  const memories = await getAllMemories();
  memoryStore.init(memories);

  // 每天凌晨 3:05 生成前一天日记忆
  createSchedule({
    cronExpression: "5 3 * * *",
    taskName: "日记忆生成",
    task: generateDayMemory,
  });

  // 每月 1 号凌晨 3:05 生成上月月记忆并删除对应日记忆
  createSchedule({
    cronExpression: "5 3 1 * *",
    taskName: "月记忆生成",
    task: generateMonthMemory,
  });

  console.log("✅ 记忆服务已启动");
}

export { memoryStore };
