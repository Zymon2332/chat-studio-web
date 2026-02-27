import { ChatMessage } from "@/components/chat/ChatMessageList";
import { SessionMessage } from "@/lib/api/conversations";

/**
 * 将 API 消息转换为组件消息格式
 * 简化版本：工具调用结果现在直接包含在 AI 消息的 toolResponses 字段中
 */
export const convertSessionMessageToChatMessage = (
  sessionMessage: SessionMessage
): ChatMessage => {
  // 根据 messageType 判断角色
  const role = sessionMessage.messageType === 'USER' ? 'user' : 'assistant';

  // USER 消息：从 contents[0].text 获取内容
  // AI 消息：从 text 获取内容
  const content = sessionMessage.messageType === 'USER'
    ? sessionMessage.contents?.[0]?.text || ''
    : sessionMessage.text || '';

  const chatMessage: ChatMessage = {
    content,
    role,
    avatar: role === 'user' ? '👤' : '🤖',
    streamCompleted: role === 'assistant',
    thinking: sessionMessage.thinking,
    toolRequests: sessionMessage.toolRequests,
    toolResponses: sessionMessage.toolResponses,
    dateTime: sessionMessage.dateTime,
  };

  // 如果是 USER 消息且包含非 TEXT 类型的内容，添加文件相关信息
  if (sessionMessage.messageType === 'USER' && sessionMessage.contents) {
    const fileContent = sessionMessage.contents.find(c => c.contentType !== 'TEXT');
    if (fileContent) {
      chatMessage.fileUrl = fileContent.url;
      chatMessage.contentType = fileContent.contentType as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF';
    }
  }

  return chatMessage;
};

/**
 * 处理会话消息列表
 * 简化版本：只需按 parentId 排序即可，工具调用结果已包含在 AI 消息中
 */
export const processSessionMessages = (
  sessionMessages: SessionMessage[]
): SessionMessage[] => {
  // 按 parentId 排序消息
  return sessionMessages.sort((a, b) => (a.parentId || 0) - (b.parentId || 0));
};
