import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/db/mysql";
import createRecordStore from "@/stores/record";

const recordStore = createRecordStore();

export type MessageType = "user" | "ai";

export interface ChatRecord {
  id: number;
  userId: string | null;
  groupId: string | null;
  userName: string | null;
  groupName: string | null;
  content: string;
  type: MessageType;
  createdAt: Date;
}

export interface ChatRecordBase {
  userId?: string;
  groupId?: string;
  userName?: string;
  groupName?: string;
  content: string;
  type: MessageType;
}

// 创建 record 表
export async function createRecordTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS record (
      id INT PRIMARY KEY AUTO_INCREMENT,
      userId VARCHAR(100) COMMENT '用户ID',
      groupId VARCHAR(100) COMMENT '群组ID',
      userName VARCHAR(100) COMMENT '用户名',
      groupName VARCHAR(200) COMMENT '群组名',
      content TEXT NOT NULL COMMENT '聊天内容',
      type VARCHAR(10) NOT NULL COMMENT '消息类型：user-用户消息，ai-AI消息',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      INDEX idx_userId (userId),
      INDEX idx_groupId (groupId),
      INDEX idx_type (type),
      INDEX idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天记录表'
  `;
  await pool.execute(sql);
}

// 添加聊天记录
export async function addChatRecord(params: ChatRecordBase): Promise<number> {
  const { userId, groupId, userName, groupName, content, type } = params;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO record (userId, groupId, userName, groupName, content, type) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId ?? null,
      groupId ?? null,
      userName ?? null,
      groupName ?? null,
      content,
      type,
    ],
  );
  // 缓存聊天记录
  const record: ChatRecord = {
    id: result.insertId,
    userId: userId ?? null,
    groupId: groupId ?? null,
    userName: userName ?? null,
    groupName: groupName ?? null,
    content,
    type,
    createdAt: new Date(),
  };
  recordStore.add(record);
  return result.insertId;
}

// 查询所有聊天记录
export async function getAllChatRecords(): Promise<ChatRecord[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM record ORDER BY createdAt DESC",
  );
  return rows as ChatRecord[];
}
