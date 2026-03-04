import request from './request';

// 知识库数据类型定义
export interface KnowledgeBaseTag {
  id: number;
  name: string;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  createdTime: string;
  updatedTime: string;
  docCount: number;
  tags: KnowledgeBaseTag[];
}

// 分页响应类型
export interface PageResponse<T> {
  records: T[];
  current: number;
  size: number;
  total: number;
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
  tags?: Array<{ id?: number; name: string }>;
  type: 'DOCUMENT' | 'VIDEO' | 'IMAGE';
  responseType?: 'BASIC' | 'MULTIMODAL';
  config: {
    retrievalMode: 'EMBEDDING' | 'HYBRID' | 'FULL_TEXT';
    topK: number;
    embedMinScore: number;
    fusionStrategy: 'RRF' | 'WEIGHT' | 'RERANK';
    topN?: number;
    rerankMinScore?: number;
    denseWeight?: number;
    sparseWeight?: number;
  };
}

export type UpdateKnowledgeBaseParams = Omit<CreateKnowledgeBaseParams, 'type'>;

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
export const updateKnowledgeBase = async (id: number, data: UpdateKnowledgeBaseParams): Promise<KnowledgeBase> => {
  return await request.put('/kb/update', { ...data, id });
};
