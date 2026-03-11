import { getBaiduSearch } from "@/api/baiduApi";
import createRecordStore from "@/stores/record";
import { send } from "@/services/dingtalk/send";
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

// 说话工具，用于让AI主动发起对话
export const speak_to_user = async (
  message: string,
  delayMs?: number,
): Promise<void> => {
  if (delayMs) {
    setTimeout(() => {
      send({
        msgtype: "text",
        content: message,
      });
    }, delayMs);
  } else {
    send({
      msgtype: "text",
      content: message,
    });
  }
};
