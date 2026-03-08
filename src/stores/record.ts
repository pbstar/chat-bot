import type { ChatRecord } from "@/db/record";

// 所有聊天记录
const allChatRecords = new Map<number, ChatRecord>();

const createRecordStore = () => {
  return {
    // 初始化缓存
    init(records: ChatRecord[]) {
      try {
        allChatRecords.clear();

        for (const record of records) {
          allChatRecords.set(record.id, record);
        }

        console.log(
          `初始化聊天记录缓存完成，共加载 ${allChatRecords.size} 条记录`,
        );
      } catch (error) {
        console.error("初始化聊天记录缓存失败:", error);
      }
    },

    // 根据用户ID获取聊天记录（最近24小时，content取前100字）
    getByUserId(userId: string): ChatRecord[] {
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      const records = Array.from(allChatRecords.values())
        .filter(
          (record) =>
            record.userId === userId &&
            record.createdAt.getTime() > twentyFourHoursAgo,
        )
        .map((record) => ({
          ...record,
          content:
            record.content.length > 100
              ? record.content.slice(0, 100) + "..."
              : record.content,
        }));
      return records;
    },

    // 根据群组ID获取聊天记录（最近24小时，content取前100字）
    getByGroupId(groupId: string): ChatRecord[] {
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      const records = Array.from(allChatRecords.values())
        .filter(
          (record) =>
            record.groupId === groupId &&
            record.createdAt.getTime() > twentyFourHoursAgo,
        )
        .map((record) => ({
          ...record,
          content:
            record.content.length > 100
              ? record.content.slice(0, 100) + "..."
              : record.content,
        }));
      return records;
    },

    // 添加聊天记录
    add(record: ChatRecord): void {
      // 存储到全局Map
      allChatRecords.set(record.id, record);
    },
  };
};

export default createRecordStore;
