import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

interface Props<T = unknown> {
  url: string;
  data?: T;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  noHeaders?: boolean;
  retries?: number;
  rest?: Omit<AxiosRequestConfig, "url" | "data" | "method" | "headers">;
}

export const defaultAxios = axios.create();

defaultAxios.interceptors.request.use(
  (config) => {
    config.headers["Content-Type"] = "application/json";
    config.headers["accept"] = "application/json"; // force accept header
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

const executeHttp = async ({
  url,
  data,
  method = "GET",
  headers = {},
  noHeaders,
  retries = 2,
  ...rest
}: Props) => {
  let attempt = 0;

  const makeRequest: any = async () => {
    try {
      const response: AxiosResponse = await defaultAxios({
        method,
        url,
        headers: {
          ...(noHeaders ? {} : { accept: "application/json" }),
          ...headers,
        },
        ...(method !== "GET" ? { data } : {}),
        withCredentials: false,
        timeout: 5000,
        ...rest,
      });

      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const error = err?.response?.data;

        const shouldRetry =
          !err?.response ||
          [500, 502, 503, 504].includes(err?.response?.status ?? 0) ||
          ["ECONNABORTED", "EAI_AGAIN", "ETIMEDOUT", "ERR_NETWORK"].includes(
            err?.code ?? ""
          );

        if (shouldRetry && attempt < retries) {
          attempt++;
          console.warn(`Retrying API request... Attempt ${attempt + 1}/${3}`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));

          return makeRequest();
        }

        throw error ?? "An unknown error occurred";
      } else {
        throw err instanceof Error ? err?.message : "An unknown error occurred";
      }
    }
  };

  return makeRequest();
};

export default executeHttp;
