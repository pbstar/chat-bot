import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/db/mysql";

// 记忆类型：day-日记忆，month-月记忆，year-年记忆
export type MemoryType = "day" | "month" | "year";

export interface Memory {
  id: number;
  type: MemoryType;
  content: string;
  date: string; // 日记忆：YYYY-MM-DD，月记忆：YYYY-MM，年记忆：YYYY
  createdAt: Date;
}

// 创建 memory 表
export async function createMemoryTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS memory (
      id INT PRIMARY KEY AUTO_INCREMENT,
      type VARCHAR(10) NOT NULL COMMENT '记忆类型：day/month/year',
      content TEXT NOT NULL COMMENT '记忆内容',
      date VARCHAR(20) NOT NULL COMMENT '对应日期',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      INDEX idx_type (type),
      INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='记忆表'
  `;
  await pool.execute(sql);
}

// 添加记忆
export async function addMemory(
  params: Omit<Memory, "id" | "createdAt">,
): Promise<number> {
  const { type, content, date } = params;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO memory (type, content, date) VALUES (?, ?, ?)`,
    [type, content, date],
  );
  return result.insertId;
}

// 查询某月的所有日记忆（date like YYYY-MM-%）
export async function getDayMemoriesForMonth(
  yearMonth: string,
): Promise<Memory[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM memory WHERE type = 'day' AND date LIKE ? ORDER BY date ASC`,
    [`${yearMonth}-%`],
  );
  return rows as Memory[];
}

// 查询所有记忆，按 date 升序
export async function getAllMemories(): Promise<Memory[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM memory ORDER BY date ASC`,
  );
  return rows as Memory[];
}

// 删除指定 ids 的记忆
export async function deleteMemoriesByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  await pool.execute(`DELETE FROM memory WHERE id IN (${placeholders})`, ids);
}
