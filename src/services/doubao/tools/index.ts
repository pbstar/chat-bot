import { getBaiduSearch } from "@/api/baiduApi";
import createRecordStore from "@/stores/record";
import type { NewsItem } from "@/types/baiduApi";
import type { ChatRecord } from "@/db/record";

const recordStore = createRecordStore();

// 根据关键词百度搜索工具
export const get_baidu_search = async (query: string): Promise<NewsItem[]> => {
  return await getBaiduSearch(query);
};

// 根据关键词查询聊天记录工具
export const search_chat_records = (keyword: string): ChatRecord[] => {
  return recordStore.searchByKeyword(keyword);
};
