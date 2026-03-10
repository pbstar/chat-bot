import { DWClient, EventAck, TOPIC_ROBOT } from "dingtalk-stream";
import { post } from "@/api/request";
import { chatAgent } from "@/services/doubao/agents/chat";
import { memoryStore } from "@/services/memory";
import createRecordStore from "@/stores/record";
import { getAllChatRecords, addChatRecord } from "@/db/record";
import { delay } from "@/utils/delay";

const clientId = process.env.DINGTALK_CLIENT_ID;
const clientSecret = process.env.DINGTALK_CLIENT_SECRET;
const adminId = process.env.DINGTALK_ADMIN_ID;

if (!clientId || !clientSecret || !adminId) {
  throw new Error(
    "DINGTALK_CLIENT_ID 或 DINGTALK_CLIENT_SECRET 或 DINGTALK_ADMIN_ID 未配置",
  );
}

const recordStore = createRecordStore();
const client = new DWClient({ clientId, clientSecret });

// 使用 registerCallbackListener 接收消息，但手动发送确认响应
client.registerCallbackListener(TOPIC_ROBOT, async (event) => {
  const data = JSON.parse(event.data as string);
  const msg = {
    msgtype: data.msgtype, // 消息类型
    content: data.text?.content || "", // 消息内容
    userId: data.senderStaffId, // 发送人 ID
    name: data.senderNick, // 发送人昵称
    groupId: data.conversationType === "2" ? data.conversationId : "", // 群 ID
    groupName: data.conversationType === "2" ? data.conversationTitle : "", // 群名
    isGroup: data.conversationType === "2", // 是否为群聊
    sessionWebhook: data.sessionWebhook, // 会话 Webhook
  };
  // 手动发送确认响应，避免钉钉重试
  client.socketCallBackResponse(event.headers.messageId, {
    status: EventAck.SUCCESS,
  });
  // 过滤非管理员消息
  if (!msg.isGroup && msg.userId !== adminId) {
    post(msg.sessionWebhook, {
      msgtype: "text",
      text: { content: "我只回复管理员的私信哦~" },
    }).catch(console.error);
    return;
  }
  // 过滤非文本消息
  if (msg.msgtype !== "text") {
    post(msg.sessionWebhook, {
      msgtype: "text",
      text: { content: "我暂不支持读取非文本消息哦~" },
    }).catch(console.error);
    return;
  }
  // 记录用户消息
  addChatRecord({
    userId: msg.userId,
    userName: msg.name,
    groupId: msg.groupId,
    groupName: msg.groupName,
    content: msg.content,
    type: "user",
  });
  // 分段式对话流程
  try {
    // 获取未归档聊天记录
    const records = msg.isGroup
      ? recordStore.getByGroupId(msg.groupId)
      : recordStore.getByUserId(msg.userId);
    // 获取所有记忆
    const memories = memoryStore.getAll();
    // 闲聊Agent处理
    const response = await chatAgent(msg.content, records, memories);
    // 发送回复
    for (const item of response) {
      post(data.sessionWebhook, {
        msgtype: "text",
        text: { content: item || "暂无回复" },
      });
      addChatRecord({
        userId: msg.userId,
        userName: msg.name,
        groupId: msg.groupId,
        groupName: msg.groupName,
        content: item || "暂无回复",
        type: "ai",
      });
      // 延迟 800 毫秒，避免消息发送过快
      await delay(800);
    }
  } catch (error) {
    console.error("处理消息失败:", error);
    post(data.sessionWebhook, {
      msgtype: "text",
      text: { content: "处理消息时出现错误，请稍后重试" },
    }).catch(console.error);
  }
});

function initDingtalk() {
  client
    .connect()
    .then(() => {
      console.log("✅ 钉钉机器人已启动");
    })
    .catch(console.error);
  getAllChatRecords().then((records) => {
    recordStore.init(records);
    console.log(`初始化聊天记录缓存完成，共加载 ${records.length} 条记录`);
  });
}

export { initDingtalk };
