import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 不需要登录的接口路径列表
const NO_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/sendCode'
];

// 检查是否为不需要登录的接口
const isNoAuthPath = (url: string): boolean => {
  return NO_AUTH_PATHS.some(path => url.includes(path));
};

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 在发送请求之前做些什么
    // 从localStorage获取Auth-Token并添加到请求头
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      
      // 检查是否为需要登录的接口
      if (!isNoAuthPath(config.url || '')) {
        // 如果是需要登录的接口但没有token，直接提示并拒绝请求
        if (!token) {
          // 动态导入message以避免SSR问题
          import('antd').then(({ message }) => {
            message.warning('未登录，请先登录后才能使用此功能');
          });
          return Promise.reject(new Error('未登录，请先登录后才能使用此功能'));
        }
        
        // 添加token到请求头
        config.headers['Auth-Token'] = token;
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 对于标记为跳过响应处理的请求，直接返回响应
    if (response.config?.transformResponse === null) {
      return response;
    }
    
    // 检查响应数据是否包含标准字段
    if (typeof response.data === 'object' && 
        response.data !== null && 
        ('code' in response.data || 'success' in response.data || 'data' in response.data)) {
      // 处理通用响应格式
      const { code, msg, success, data } = response.data;
      
      // 检查响应是否成功
      if (success === false || (code && code !== 'SUCCESS')) {
        // 统一弹出错误提示
        message.error(msg || '请求失败');
        return Promise.reject(new Error(msg || '请求失败'));
      }
      
      // 返回 data 字段
      return data;
    }
    
    // 对于不包含标准字段的响应（如流式响应），直接返回
    return response.data;
  },
  (error: AxiosError) => {
    // 统一处理 HTTP 错误
    let errorMessage = '网络错误，请稍后重试';
    
    if (error.response) {
      // 服务器返回错误响应
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // 未授权，清除 token 并提示
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
          }
          errorMessage = '登录已过期，请重新登录';
          break;
        case 403:
          errorMessage = '无权访问此资源';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器错误，请稍后重试';
          break;
        default:
          // 尝试从响应数据中获取错误消息
          const responseData = data as any;
          errorMessage = responseData?.msg || responseData?.message || `请求失败 (${status})`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时，请稍后重试';
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = '网络错误，请检查网络连接';
    }
    
    // 统一弹出错误提示
    message.error(errorMessage);
    
    return Promise.reject(new Error(errorMessage));
  }
);

export default request;