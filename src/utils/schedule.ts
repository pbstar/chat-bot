import cron from "node-cron";
import dayjs from "dayjs";

interface ScheduleOptions {
  cronExpression: string; // cron 表达式
  taskName: string; // 任务名称（用于日志）
  task: () => Promise<void>; // 执行的任务
  checkProduction?: boolean; // 是否只在生产环境执行（默认 true）
}

// 创建定时任务（自动处理交易日判断和生产环境检查）
export function createSchedule(options: ScheduleOptions): void {
  const { cronExpression, taskName, task, checkProduction = true } = options;

  cron.schedule(cronExpression, async () => {
    // 检查生产环境
    if (checkProduction && process.env.NODE_ENV !== "production") {
      console.log(`[${taskName}] 非生产环境，跳过定时任务`);
      return;
    }

    console.log(
      `[${taskName}] 定时任务触发:`,
      dayjs().format("YYYY-MM-DD HH:mm:ss"),
    );

    try {
      await task();
      console.log(`[${taskName}] 任务执行完成`);
    } catch (error) {
      console.error(`[${taskName}] 任务执行失败:`, error);
    }
  });
}
