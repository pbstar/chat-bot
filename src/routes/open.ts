import { Router } from "express";
import { steamAuthMiddleware } from "@/routes/middleware/steamAuth";
import { send } from "@/services/dingtalk/send";

const router = Router();
router.use(steamAuthMiddleware);

// 发送钉钉消息接口
router.post("/send", async (req, res) => {
  try {
    const { msgtype, content } = req.body;

    // 参数校验
    if (!msgtype || !content) {
      res.json({
        success: false,
        message: "缺少必要参数：msgtype 和 content",
      });
      return;
    }

    // 校验消息类型
    if (!["text", "markdown"].includes(msgtype)) {
      res.json({
        success: false,
        message: "msgtype 必须是 text 或 markdown",
      });
      return;
    }

    // 发送消息
    await send({ msgtype, content });

    res.json({
      success: true,
      message: "消息发送成功",
    });
  } catch (error) {
    console.error("发送消息失败:", error);
    res.status(500).json({
      success: false,
      message: "消息发送失败",
      error: error || "未知错误",
    });
  }
});

export default router;
