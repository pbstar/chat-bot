import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "my_stock",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 连接超时配置
  connectTimeout: 10000, // 10秒连接超时
  // 启用 keepAlive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// 测试连接
pool
  .getConnection()
  .then((connection) => {
    console.log("数据库连接成功");
    connection.release();
  })
  .catch((err) => {
    console.error("数据库连接失败:", err.message);
  });

export default pool;
