/**
 * 深度思考内容处理工具函数
 */

export interface ThinkingContent {
  thinkingText: string;
  remainingContent: string;
}

/**
 * 从内容中提取深度思考内容
 * @param content 原始内容
 * @returns 提取的深度思考内容和剩余内容
 */
export function extractThinkingContent(content: string): ThinkingContent {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let thinkingText = '';
  let remainingContent = content;
  
  // 提取所有 <think></think> 标签内的内容
  let match;
  const thinkingParts: string[] = [];
  
  while ((match = thinkRegex.exec(content)) !== null) {
    // 保持原始格式，不进行trim处理
    thinkingParts.push(match[1]);
  }
  
  if (thinkingParts.length > 0) {
    // 直接连接，不添加额外的换行
    thinkingText = thinkingParts.join('');
    // 移除原内容中的 <think></think> 标签及其内容
    remainingContent = content.replace(thinkRegex, '').trim();
  }
  
  return {
    thinkingText,
    remainingContent
  };
}

/**
 * 检查内容是否包含深度思考标签
 * @param content 内容
 * @returns 是否包含深度思考内容
 */
export function hasThinkingContent(content: string): boolean {
  return /<think>[\s\S]*?<\/think>/.test(content);
}

/**
 * 移除内容中的 <think></think> 标签
 * @param content 原始内容
 * @returns 移除标签后的内容
 */
export function removeThinkingTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}