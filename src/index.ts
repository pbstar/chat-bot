import express from "express";
import { initDingtalk } from "@/services/dingtalk";

const app = express();
const PORT = Number(process.env.PORT) || 1801;

app.use(express.json());

const main = (): void => {
  app.listen(PORT, () => {
    console.log(`chat-bot running: http://localhost:${PORT}`);
    initDingtalk();
  });
};

main();
