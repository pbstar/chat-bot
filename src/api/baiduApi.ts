import { post } from "./request";
import type { NewsItem } from "@/types/baiduApi";

// 定义百度搜素响应接口
export interface BaiduNewsResponse {
  references: {
    content: string;
    date: string;
    website: string;
  }[];
}

// 百度搜索
export const getBaiduSearch = async (
  query: string,
  range?: "week" | "month" | "year",
): Promise<NewsItem[]> => {
  const url = `https://qianfan.baidubce.com/v2/ai_search/web_search`;
  const res = await post<BaiduNewsResponse>(
    url,
    {
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      resource_type_filter: [{ type: "web", top_k: 10 }],
      ...(range && { search_recency_filter: range }),
    },
    {
      headers: {
        "X-Appbuilder-Authorization": `Bearer ${process.env.BAIDU_API_KEY}`,
      },
    },
  );
  return (
    res?.references.map((item) => ({
      content: item.content?.slice(0, 360) || "",
      time: item.date,
      source: item.website || "百度",
    })) || []
  );
};
