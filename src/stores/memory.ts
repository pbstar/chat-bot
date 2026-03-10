import type { Memory } from "@/db/memory";

// 所有记忆（模块级单例）
const allMemories = new Map<number, Memory>();

const createMemoryStore = () => {
  return {
    // 初始化缓存
    init(memories: Memory[]) {
      allMemories.clear();
      for (const memory of memories) {
        allMemories.set(memory.id, memory);
      }
      console.log(`初始化记忆缓存完成，共加载 ${allMemories.size} 条记忆`);
    },

    // 获取所有记忆，按 date 升序
    getAll(): Memory[] {
      return Array.from(allMemories.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    },

    // 添加记忆
    add(memory: Memory): void {
      allMemories.set(memory.id, memory);
    },

    // 批量删除记忆
    removeByIds(ids: number[]): void {
      for (const id of ids) {
        allMemories.delete(id);
      }
    },
  };
};

export default createMemoryStore;
