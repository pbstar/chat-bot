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

    // 根据用户ID获取未归档的聊天记录（content 取前 100 字）
    getByUserId(userId: string): ChatRecord[] {
      return Array.from(allChatRecords.values())
        .filter((r) => r.userId === userId && !r.isMemorized)
        .map((r) => ({
          ...r,
          content:
            r.content.length > 100
              ? r.content.slice(0, 100) + "..."
              : r.content,
        }));
    },

    // 根据群组ID获取未归档的聊天记录（content 取前 100 字）
    getByGroupId(groupId: string): ChatRecord[] {
      return Array.from(allChatRecords.values())
        .filter((r) => r.groupId === groupId && !r.isMemorized)
        .map((r) => ({
          ...r,
          content:
            r.content.length > 100
              ? r.content.slice(0, 100) + "..."
              : r.content,
        }));
    },

    // 添加聊天记录
    add(record: ChatRecord): void {
      allChatRecords.set(record.id, record);
    },

    // 批量标记为已归档
    markAsMemorized(ids: number[]): void {
      for (const id of ids) {
        const record = allChatRecords.get(id);
        if (record) {
          allChatRecords.set(id, { ...record, isMemorized: true });
        }
      }
    },
  };
};

export default createRecordStore;
