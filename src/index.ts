import express from "express";
import { initRobot } from "@/services/robot";
import openRoutes from "@/routes/open";

const app = express();
const PORT = Number(process.env.PORT) || 1801;

app.use(express.json());

// 注册路由
app.use("/api/open", openRoutes);

const main = (): void => {
  app.listen(PORT, () => {
    console.log(`chat-bot running: http://localhost:${PORT}`);
    initRobot();
  });
};

main();
