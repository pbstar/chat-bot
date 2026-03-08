import express from "express";
import { initDingtalk } from "@/services/dingtalk";
import openRoutes from "@/routes/open";

const app = express();
const PORT = Number(process.env.PORT) || 1801;

app.use(express.json());

// 注册路由
app.use("/api/open", openRoutes);

const main = (): void => {
  app.listen(PORT, () => {
    console.log(`chat-bot running: http://localhost:${PORT}`);
    initDingtalk();
  });
};

main();
