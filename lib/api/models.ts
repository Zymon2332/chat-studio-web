import request from './request';
import { DictItem } from './common';

// 模型提供商数据类型定义
export interface ModelProvider {
  id: string;
  providerName: string;
  sourceType: string;
  baseUrl: string;
  icon: string;
  description: string;
}

// 已安装模型数据类型定义
export interface InstalledModel {
  id: number;
  providerId: string;
  icon: string;
  modelInstalledName: string;
  sourceType: 'service' | 'local';
  enabled: boolean;
}

// 默认模型数据类型定义
export interface DefaultModel {
  id: number;
  providerId: string;
  modelName: string;
  icon: string;
  sort: number;
  def: boolean;
  abilities: string;
  created?: number;
}

// API响应类型定义
export interface ModelProvidersResponse {
  code: string;
  msg: string;
  success: boolean;
  data: ModelProvider[];
}

// 已安装模型API响应类型定义
export interface InstalledModelsResponse {
  code: string;
  msg: string;
  success: boolean;
  data: InstalledModel[];
}

// 新的模型列表数据类型定义
export interface ModelListItem {
  id: number;
  modelName: string;
  sort: number;
  def: boolean;
  abilities: string;
  created?: number; // 模型发布时间戳，可选字段
  providerId?: string; // 提供商ID，可选字段，在选择时添加
  icon?: string; // 模型图标
}

export interface ModelProviderWithModels {
  providerId: string;
  providerName: string;
  icon: string;
  models: ModelListItem[];
}

// 新的模型列表API响应类型定义
export interface ModelListResponse {
  code: string;
  msg: string;
  success: boolean;
  data: ModelProviderWithModels[];
}

// 默认模型API响应类型定义
export interface DefaultModelResponse {
  code: string;
  msg: string;
  success: boolean;
  data: DefaultModel | null;
}

// 获取模型列表
export const getModelList = async (): Promise<ModelProviderWithModels[]> => {
  return await request.get('/models/list', {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
};

// 获取模型提供商列表
export const getModelProviders = async (): Promise<ModelProvider[]> => {
  try {
    const data = await request.get('/models/modelProviders');
    return data as unknown as ModelProvider[];
  } catch (error) {
    console.error('获取模型提供商列表失败:', error);
    throw error;
  }
};

// 获取已安装模型列表
export const getInstalledModels = async (): Promise<InstalledModel[]> => {
  try {
    const data = await request.get('/models/installed/list');
    return data as unknown as InstalledModel[];
  } catch (error) {
    console.error('获取已安装模型列表失败:', error);
    throw error;
  }
};

// 安装模型接口
// 将路径参数改为通过请求体传递，包含 providerId 和 apiKey 以及其他配置参数
export const installModel = async (providerId: string, apiKey: string, settings?: Partial<ModelSettings>): Promise<void> => {
  await request.post('/models/install', {
    providerId,
    apiKey,
    ...settings
  });
};

// 获取默认模型
export const getDefaultModel = async (): Promise<DefaultModel | null> => {
  const data = await request.get('/models/default');
  return data as unknown as DefaultModel | null;
};

// 设置默认模型
export const setDefaultModel = async (modelId: number): Promise<void> => {
  await request.post(`/models/setDefault/${modelId}`);
};

// 模型设置接口
export interface ModelSettings {
  apiKey: string;
  baseUrl: string;
  useDefault?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// 获取模型配置信息
export const getModelSettings = async (providerId: string): Promise<ModelSettings> => {
  try {
    // 响应拦截器已经处理了标准响应格式，直接返回data字段内容
    const data = await request.get(`/models/settings/info?providerId=${providerId}`);
    return data as unknown as ModelSettings;
  } catch (error) {
    console.error('获取模型配置信息失败:', error);
    throw error;
  }
};

// 修改模型配置
export const modifyModelSettings = async (
  modelInstalledId: number, 
  providerId: string, 
  settings: Partial<ModelSettings>
): Promise<void> => {
  const requestBody: any = {
    modelInstalledId,
    providerId,
    ...settings
  };
  
  await request.put('/models/modify/settings', requestBody);
  // 响应拦截器会处理错误，成功时直接返回即可
};

// 删除模型
export const deleteModel = async (providerId: string): Promise<void> => {
  await request.delete(`/models/delete/${providerId}`);
  // 响应拦截器会处理错误，成功时直接返回即可
};

// 新增模型定义
export const createModel = async (model: Partial<ModelListItem>): Promise<void> => {
  await request.post('/models/add/model', model);
};

// 删除模型定义
export const removeModel = async (id: number): Promise<void> => {
  await request.delete(`/models/deleteModel/${id}`);
};

// 获取模型目录
export const getModelCatalog = async (providerId: string): Promise<string[]> => {
  return await request.get(`/models/catalog/${providerId}`);
};