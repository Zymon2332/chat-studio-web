/**
 * 工具调用内容处理工具函数
 */

import type { ToolRequest, ToolResponse } from '@/lib/api/conversations';

export interface ToolContent {
  toolText: string;
  remainingContent: string;
}

/**
 * 从内容中提取工具调用内容
 * @param content 原始内容
 * @returns 提取的工具调用内容和剩余内容
 */
export function extractToolContent(content: string): ToolContent {
  const toolRegex = /<tool>([\s\S]*?)<\/tool>/g;
  let toolText = '';
  let remainingContent = content;
  
  // 提取所有 <tool></tool> 标签内的内容
  let match;
  const toolParts: string[] = [];
  
  while ((match = toolRegex.exec(content)) !== null) {
    // 保持原始格式，不进行trim处理
    toolParts.push(match[1]);
  }
  
  if (toolParts.length > 0) {
    // 直接连接，不添加额外的换行
    toolText = toolParts.join('');
    // 移除原内容中的 <tool></tool> 标签及其内容
    remainingContent = content.replace(toolRegex, '').trim();
  }
  
  return {
    toolText,
    remainingContent
  };
}

/**
 * 检查内容是否包含工具调用标签
 * @param content 内容
 * @returns 是否包含工具调用内容
 */
export function hasToolContent(content: string): boolean {
  return /<tool>[\s\S]*?<\/tool>/.test(content);
}

/**
 * 解析工具调用内容，提取工具名称列表
 * @param toolText 工具调用文本内容
 * @returns 工具名称列表
 */
export function parseToolNames(toolText: string): string[] {
  if (!toolText) return [];
  
  // 按行分割，过滤空行，去除前后空格
  const lines = toolText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  return lines;
}

/**
 * 从内容中提取所有工具名称（支持多个独立的<tool>标签）
 * @param content 原始内容
 * @returns 工具名称列表
 */
export function extractAllToolNames(content: string): string[] {
  const toolRegex = /<tool>([\s\S]*?)<\/tool>/g;
  const toolNames: string[] = [];
  let match;
  
  // 提取所有 <tool> 标签中的工具名称
  while ((match = toolRegex.exec(content)) !== null) {
    const toolContent = match[1].trim();
    if (toolContent && !toolNames.includes(toolContent)) {
      toolNames.push(toolContent);
    }
  }
  
  return toolNames;
}

/**
 * 增量解析工具调用内容，避免重复解析
 * @param previousTools 之前解析的工具列表
 * @param newContent 新接收的内容
 * @returns 更新后的工具名称列表
 */
export function incrementalParseTools(
  previousTools: string[], 
  newContent: string
): string[] {
  if (!newContent) return previousTools;
  
  // 提取完整的工具内容（包括之前可能已经解析过的）
  const { toolText } = extractToolContent(newContent);
  if (!toolText) return previousTools;
  
  // 解析当前完整的工具列表
  const currentTools = parseToolNames(toolText);
  
  // 如果当前解析的工具数量与之前相同，说明没有新工具，直接返回之前的列表
  if (currentTools.length === previousTools.length) {
    return previousTools;
  }
  
  // 如果有新工具，返回完整的当前工具列表
  // 这样可以确保工具顺序和完整性
  return currentTools;
}

/**
 * 从内容中提取并解析 ToolRequest
 * @param content 原始内容
 * @returns ToolRequest 列表
 */
export function parseToolRequests(content: string): ToolRequest[] {
  const toolRegex = /<tool>([\s\S]*?)<\/tool>/g;
  const requests: ToolRequest[] = [];
  let match;
  
  while ((match = toolRegex.exec(content)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const request = JSON.parse(jsonStr) as ToolRequest;
      requests.push(request);
    } catch (e) {
      // JSON 解析失败，跳过
    }
  }
  
  return requests;
}

/**
 * 从内容中提取并解析 ToolResponse
 * @param content 原始内容
 * @returns ToolResponse 列表
 */
export function parseToolResponses(content: string): ToolResponse[] {
  const resultRegex = /<result>([\s\S]*?)<\/result>/g;
  const responses: ToolResponse[] = [];
  let match;
  
  while ((match = resultRegex.exec(content)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const response = JSON.parse(jsonStr) as ToolResponse;
      responses.push(response);
    } catch (e) {
      // JSON 解析失败，跳过
    }
  }
  
  return responses;
}

/**
 * 移除<tool>和<result>标签后的纯文本内容
 * @param content 原始内容
 * @returns 清理后的内容
 */
export function removeToolTags(content: string): string {
  return content
    .replace(/<tool>[\s\S]*?<\/tool>/g, '')
    .replace(/<result>[\s\S]*?<\/result>/g, '')
    .trim();
}