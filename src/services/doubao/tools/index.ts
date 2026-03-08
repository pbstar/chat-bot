import { getBaiduSearch } from "@/api/baiduApi";
import type { NewsItem } from "@/types/baiduApi";

// 根据关键词百度搜索工具
export const get_baidu_search = async (query: string): Promise<NewsItem[]> => {
  return await getBaiduSearch(query);
};
