import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import queryString from "query-string";

type ResponseBody<ResponseDataType = Record<string, any>> = {
  readonly statusCode: number;
  readonly data?: ResponseDataType | null;
  readonly message?: string | null;
};

type Response<ResponseDataType = Record<string, any>> = {
  readonly data?: ResponseDataType | null;
  readonly error?: Error;
};

async function request<RequestDataType = any, ResponseDataType = Record<string, any>>(method: string, path: string, data?: RequestDataType, requestConfig?: AxiosRequestConfig<RequestDataType>): Promise<Response<ResponseDataType>> {
  try {
    const token: string | null = localStorage.getItem("jwtToken");
    if (!token && !/\/login$/.test(path)) {
      throw new Error("Unauthorized");
    }
    const { data: responseData }: AxiosResponse<ResponseBody<ResponseDataType>, RequestDataType> = await axios({
      url: `${process.env.NEXT_PUBLIC_API_BASE}${path}`,
      data: data,
      headers: {
        ...(token ? {"Authorization": `Bearer ${token}`} : {}),
        "Content-Type": "application/json",
        ...requestConfig?.headers
      },
      ...requestConfig,
      method: method
    });
    if (responseData.statusCode >= 400 && responseData.statusCode < 600) {
      throw new Error(responseData.message || "System error");
    }
    return {
      data: responseData.data
    };
  } catch (error) {
    return {
      error: error as Error
    };
  }
}

function _get<RequestDataType extends Record<string, any>, ResponseDataType extends Record<string, any>>(path: string, data?: RequestDataType, requestConfig?: AxiosRequestConfig<string>) {
  return request<string, ResponseDataType>("GET", path, data ? queryString.stringify(data) : undefined, requestConfig);
}

function _post<RequestDataType = any, ResponseDataType = Record<string, any>>(path: string, data?: RequestDataType, requestConfig?: AxiosRequestConfig<RequestDataType>) {
  return request<RequestDataType, ResponseDataType>("POST", path, data, requestConfig);
}

function _put<RequestDataType = any, ResponseDataType = Record<string, any>>(path: string, data?: RequestDataType, requestConfig?: AxiosRequestConfig<RequestDataType>) {
  return request<RequestDataType, ResponseDataType>("PUT", path, data, requestConfig);
}

function _patch<RequestDataType = any, ResponseDataType = Record<string, any>>(path: string, data?: RequestDataType, requestConfig?: AxiosRequestConfig<RequestDataType>) {
  return request<RequestDataType, ResponseDataType>("PATCH", path, data, requestConfig);
}

function _delete<RequestDataType = any, ResponseDataType = Record<string, any>>(path: string, data?: RequestDataType, requestConfig?: AxiosRequestConfig<RequestDataType>) {
  return request<RequestDataType, ResponseDataType>("DELETE", path, data, requestConfig);
}

export function useRequest() {
  return {
    get: _get,
    post: _post,
    put: _put,
    patch: _patch,
    delete: _delete
  };
}