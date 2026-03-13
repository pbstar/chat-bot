import { post } from "@/api/request";

const clientId = process.env.DINGTALK_CLIENT_ID;
const clientSecret = process.env.DINGTALK_CLIENT_SECRET;
const adminId = process.env.DINGTALK_ADMIN_ID;

if (!clientId || !clientSecret || !adminId) {
  throw new Error(
    "DINGTALK_CLIENT_ID 或 DINGTALK_CLIENT_SECRET 或 DINGTALK_ADMIN_ID 未配置",
  );
}

// Token 缓存
let cachedToken: string | null = null;
let tokenExpireTime = 0;
// 获取 accessToken，带缓存（有效期约2小时，这里设置1.5小时刷新）
async function getToken(): Promise<string> {
  const now = Date.now();

  // 如果缓存有效，直接返回
  if (cachedToken && now < tokenExpireTime) {
    return cachedToken;
  }

  // 重新获取
  const res = await post<{ accessToken: string; expireIn?: number }>(
    "https://api.dingtalk.com/v1.0/oauth2/accessToken",
    {
      appKey: clientId,
      appSecret: clientSecret,
    },
  );

  cachedToken = res.accessToken;
  // 提前5分钟过期，避免边界问题
  tokenExpireTime = now + (res.expireIn ?? 7200) * 1000 - 5 * 60 * 1000;

  return cachedToken;
}

interface SendData {
  msgtype: string;
  content: string;
  // 指定用户 ID 列表，不传则发给管理员
  userIds?: string[];
  // 指定群会话 ID，传入则发送群消息
  conversationId?: string;
}

// 构造消息参数
function buildMsgParam(
  msgtype: string,
  content: string,
): { msgKey: string; msgParam: string } {
  const msgKey = msgtype === "markdown" ? "sampleMarkdown" : "sampleText";
  let msgParam: Record<string, unknown> = { content };

  if (msgtype === "markdown") {
    // 提取第一行作为标题，过滤 markdown 符号，取前10个字
    const firstLine = content.split("\n")[0] ?? "";
    const title = firstLine
      .replace(/[*#`\-\[\]!]/g, "")
      .trim()
      .slice(0, 10);
    msgParam = { title, text: content };
  }

  return { msgKey, msgParam: JSON.stringify(msgParam) };
}

// 发送钉钉消息，支持指定用户/群，默认发给管理员
async function send(data: SendData): Promise<void> {
  const token = await getToken();
  const headers = { "x-acs-dingtalk-access-token": token };
  const { msgKey, msgParam } = buildMsgParam(data.msgtype, data.content);

  if (data.conversationId) {
    // 发送群消息
    await post(
      "https://api.dingtalk.com/v1.0/robot/groupMessages/send",
      {
        robotCode: clientId,
        openConversationId: data.conversationId,
        msgKey,
        msgParam,
      },
      { headers },
    );
    console.log(
      `✅ 已向群 ${data.conversationId} 发送: ${data.content.slice(0, 50)}...`,
    );
  } else {
    // 发送单聊消息，userIds 不传则默认管理员
    const targetIds = data.userIds?.length ? data.userIds : [adminId];
    await post(
      "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend",
      { robotCode: clientId, userIds: targetIds, msgKey, msgParam },
      { headers },
    );
    console.log(
      `✅ 已向用户 ${targetIds.join(",")} 发送: ${data.content.slice(0, 50)}...`,
    );
  }
}

export { send };
