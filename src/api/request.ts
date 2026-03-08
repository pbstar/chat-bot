import axios, { type AxiosRequestConfig } from "axios";

const instance = axios.create({
  timeout: 100000,
});

export const get = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const response = await instance.get<T>(url, config);
  return response.data;
};

export const post = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> => {
  const response = await instance.post<T>(url, data, config);
  return response.data;
};
