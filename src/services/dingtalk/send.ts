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

// 发送给管理员
async function send(data: { msgtype: string; content: string }) {
  const token = await getToken();

  // 根据消息类型选择 msgKey
  const msgKey = data.msgtype === "markdown" ? "sampleMarkdown" : "sampleText";

  // 构造 msgParam
  let msgParam: Record<string, unknown> = {
    content: data.content,
  };
  if (data.msgtype === "markdown") {
    // 提取第一行作为标题，过滤 markdown 符号，取前10个字
    const firstLine = data.content.split("\n")[0] ?? "";
    const title = firstLine
      .replace(/[*#`\-\[\]!]/g, "")
      .trim()
      .slice(0, 10);
    msgParam = {
      title,
      text: data.content,
    };
  }

  await post(
    "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend",
    {
      robotCode: clientId,
      userIds: [adminId],
      msgKey,
      msgParam: JSON.stringify(msgParam),
    },
    {
      headers: {
        "x-acs-dingtalk-access-token": token,
      },
    },
  );
  console.log(`✅ 已向用户 ${adminId} 发送: ${data.content.slice(0, 50)}...`);
}

export { send };
