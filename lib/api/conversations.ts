import request from './request';
import {
  XRequest,
  type AbstractXRequestClass,
  type SSEOutput,
} from '@ant-design/x-sdk';

// 创建会话接口返回的 sessionId 类型
export type SessionId = string;

// 会话列表项类型
export interface SessionItem {
  sessionId: string;
  sessionTitle: string;
  updatedAt: number;
}

// 内容项类型
export interface ContentItem {
  contentType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF';
  text?: string;  // TEXT 类型使用
  url?: string;   // IMAGE/VIDEO/AUDIO/PDF 类型使用
  detailLevel?: string; // IMAGE 类型使用
}

// 工具调用请求类型
export interface ToolRequest {
  id: string;
  name: string;
  argument: string; // JSON 字符串
}

// 工具调用响应类型
export interface ToolResponse {
  id: string; // 与对应的 ToolRequest.id 一致
  toolName: string;
  text: string;
  isError: boolean | null;
}

// 会话消息类型
export interface SessionMessage {
  messageType: 'USER' | 'AI';
  contents?: ContentItem[]; // USER 消息
  text?: string; // AI 消息或 USER 消息的文本
  thinking?: string; // AI 消息的思考过程
  toolRequests?: ToolRequest[]; // AI 消息的工具调用请求
  toolResponses?: ToolResponse[]; // AI 消息的工具调用结果（与 toolRequests id 对应）
  parentId?: number; // 保留用于排序
  dateTime?: string; // 消息时间
}

// 创建会话接口
export const createSession = (): Promise<SessionId> => {
  return request.post<SessionId>('/session/create') as unknown as Promise<SessionId>;
};

// 获取会话列表接口
export const getSessionList = (): Promise<SessionItem[]> => {
  return request.get<SessionItem[]>('/session/list') as unknown as Promise<SessionItem[]>;
};

// 获取会话消息接口
export const getSessionMessages = (sessionId: string): Promise<SessionMessage[]> => {
  return request.get<SessionMessage[]>(`/session/messages/${sessionId}`) as unknown as Promise<SessionMessage[]>;
};

// 删除会话接口 - 支持单个或批量删除
export const deleteSession = (sessionId: string | string[]): Promise<void> => {
  const sessionIds = Array.isArray(sessionId) ? sessionId : [sessionId];
  return request.delete<void>(`/session/delete`, { data: sessionIds }) as unknown as Promise<void>;
};

// 修改会话标题接口
export const updateSessionTitle = (sessionId: string, title: string): Promise<void> => {
  return request.put<void>(`/session/modify/title/${sessionId}/${encodeURIComponent(title)}`) as unknown as Promise<void>;
};

// 聊天接口参数类型
export interface ChatRequest {
  sessionId: string;
  prompt: string;
  providerId?: string; // 模型提供商 ID
  modelName?: string; // 模型名称
  uploadId?: string; // 上传文件 ID
  contentType?: string; // 上传文件类型
}

// 聊天接口返回类型 - 流式响应
export type ChatResponse = string;

export interface ChatStreamCallbacks {
  onUpdate?: (chunk: SSEOutput) => void;
  onSuccess?: (chunks: SSEOutput[]) => void;
  onError?: (error: Error, errorInfo?: any) => void;
}

export const parseChatStreamChunk = (chunk: SSEOutput): string => {
  const rawData =
    typeof chunk?.data === 'string' ? chunk.data.trim() : '';
  if (!rawData || rawData === '[DONE]') {
    return '';
  }

  try {
    const parsed = JSON.parse(rawData) as { content?: string; text?: string };
    if (typeof parsed.content === 'string') {
      return parsed.content;
    }
    if (typeof parsed.text === 'string') {
      return parsed.text;
    }
    return '';
  } catch {
    return rawData;
  }
};

// 基于 x-sdk XRequest 的流式聊天接口
export const createChatStreamRequest = (
  data: ChatRequest,
  callbacks: ChatStreamCallbacks = {}
): AbstractXRequestClass<ChatRequest, SSEOutput> => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';

  const requestInstance = XRequest<ChatRequest, SSEOutput>('/api/chat/v1/chat', {
    manual: true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
      ...(token ? { 'Auth-Token': token } : {}),
    },
    callbacks: {
      onUpdate: (chunk: SSEOutput) => {
        callbacks.onUpdate?.(chunk);
      },
      onSuccess: (chunks: SSEOutput[]) => {
        callbacks.onSuccess?.(chunks);
      },
      onError: (error: Error, errorInfo?: any) => {
        callbacks.onError?.(error, errorInfo);
      },
    },
  });

  requestInstance.run(data);
  return requestInstance;
};
