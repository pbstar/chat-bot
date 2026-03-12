import { DWClient, EventAck, TOPIC_ROBOT } from "dingtalk-stream";
import { post } from "@/api/request";
import { addChatRecord } from "@/db/record";

const clientId = process.env.DINGTALK_CLIENT_ID;
const clientSecret = process.env.DINGTALK_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("DINGTALK_CLIENT_ID 或 DINGTALK_CLIENT_SECRET 未配置");
}

const client = new DWClient({ clientId, clientSecret });

function initDingtalk(send: (message: string) => void) {
  client
    .connect()
    .then(() => {
      console.log("✅ 钉钉机器人已启动");
    })
    .catch(console.error);
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
    if (msg.isGroup) {
      post(msg.sessionWebhook, {
        msgtype: "text",
        text: { content: "我暂不支持读取群消息哦~" },
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
    // 发送给机器人
    send(msg.content);
  });
}

export { initDingtalk };
