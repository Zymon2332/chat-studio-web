import request from './request';

// 知识库数据类型定义
export interface KnowledgeBase {
  id: number;
  name: string;
  description: string;
  createdTime: string;
  updatedTime: string;
  docCount: number;
  tags: Array<{ id: number; name: string }>;
  retrievalMode?: string;
  topK?: number;
  rerankEnabled?: boolean;
  embedMinScore?: number;
  topN?: number;
  rerankMinScore?: number;
}

// 分页响应类型
export interface PageResponse<T> {
  records: T[];
  current: number;
  size: number;
  total: number;
}

// API响应类型
export interface ApiResponse<T> {
  code: string;
  msg: string;
  success: boolean;
  data: T;
}

// 分页参数
export interface PageParams {
  pageNum: number;
  pageSize: number;
  keyword?: string;
}

// 新增知识库参数
export interface TagItem {
  id: number;
  name: string;
}

export interface CreateKnowledgeBaseParams {
  name: string;
  description?: string;
  retrievalMode: string;
  topK: number;
  rerankEnabled: boolean;
  embedMinScore: number;
  topN?: number;
  rerankMinScore?: number;
  tags?: Array<{ id?: number; name: string }>;
}

// 获取知识库分页数据
export const getKnowledgeBasePage = async (params: PageParams): Promise<PageResponse<KnowledgeBase>> => {
  return await request.get('/kb/page', {
    params: {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      ...(params.keyword && { keyword: params.keyword })
    }
  });
};

// 获取知识库详情
export const getKnowledgeBaseInfo = async (id: number): Promise<KnowledgeBase> => {
  return await request.get(`/kb/info/${id}`);
};

// 删除知识库
export const deleteKnowledgeBase = async (id: number): Promise<void> => {
  await request.delete(`/kb/delete/${id}`);
};

export const getKnowledgeBaseTags = (): Promise<TagItem[]> => {
  return request.get('/tags/kb');
};

// 创建知识库
export const createKnowledgeBase = async (data: CreateKnowledgeBaseParams): Promise<KnowledgeBase> => {
  return await request.post('/kb/add', data);
};

// 更新知识库
export const updateKnowledgeBase = async (id: number, data: CreateKnowledgeBaseParams): Promise<KnowledgeBase> => {
  return await request.put('/kb/update', { ...data, id });
};