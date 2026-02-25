import { ChatMessage } from "@/components/chat/ChatMessageList";
import { SessionMessage, ToolResponse } from "@/lib/api/conversations";

/**
 * 将 API 消息转换为组件消息格式
 */
export const convertSessionMessageToChatMessage = (
  sessionMessage: SessionMessage,
  toolResultMessages?: SessionMessage[]
): ChatMessage => {
  // 根据 messageType 判断角色
  const role = sessionMessage.messageType === 'USER' ? 'user' : 'assistant';

  // USER 消息：从 contents[0].text 获取内容
  // AI 消息：从 text 获取内容
  const content = sessionMessage.messageType === 'USER'
    ? sessionMessage.contents?.[0]?.text || ''
    : sessionMessage.text || '';

  // 匹配工具调用结果（历史消息格式）
  const matchedToolResults: ToolResponse[] = toolResultMessages?.filter(
    tr => sessionMessage.toolRequests?.some(req => req.id === tr.toolResponse?.id)
  ).map(tr => tr.toolResponse!) || [];

  const chatMessage: ChatMessage = {
    content,
    role,
    avatar: role === 'user' ? '👤' : '🤖',
    thinking: sessionMessage.thinking,
    toolRequests: sessionMessage.toolRequests,
    toolResults: matchedToolResults.length > 0 ? matchedToolResults : undefined,
    dateTime: sessionMessage.dateTime,
  };

  // 如果是 USER 消息且包含非 TEXT 类型的内容，添加文件相关信息
  if (sessionMessage.messageType === 'USER' && sessionMessage.contents) {
    const fileContent = sessionMessage.contents.find(c => c.contentType !== 'TEXT');
    if (fileContent) {
      chatMessage.fileUrl = fileContent.text;
      chatMessage.contentType = fileContent.contentType as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF';
    }
  }

  return chatMessage;
};

/**
 * 合并连续的 AI 消息
 * 将 thinking/toolRequests 与后续的 text 合并
 */
export const mergeConsecutiveAIMessages = (
  messages: SessionMessage[]
): SessionMessage[] => {
  const mergedMessages: SessionMessage[] = [];
  let pendingAIMessage: SessionMessage | null = null;

  for (const msg of messages) {
    if (msg.messageType === 'AI') {
      // 如果有待处理的 AI 消息（有 thinking 或 toolRequests 但 text 为空）
      if (pendingAIMessage) {
        // 如果当前 AI 消息有 text，合并到 pendingAIMessage
        if (msg.text && msg.text.trim() !== '') {
          const mergedMessage: SessionMessage = {
            ...pendingAIMessage,
            text: msg.text,
            dateTime: msg.dateTime || pendingAIMessage.dateTime,
            // 合并 toolRequests（如果后续消息也有）
            toolRequests: msg.toolRequests
              ? [...(pendingAIMessage.toolRequests || []), ...msg.toolRequests]
              : pendingAIMessage.toolRequests,
          };
          mergedMessages.push(mergedMessage);
          pendingAIMessage = null;
        } else {
          // 如果当前 AI 消息也没有 text，继续等待
          // 合并 toolRequests
          if (msg.toolRequests && msg.toolRequests.length > 0) {
            if (!pendingAIMessage.toolRequests) {
              pendingAIMessage.toolRequests = [];
            }
            pendingAIMessage.toolRequests.push(...msg.toolRequests);
          }
        }
      } else {
        // 检查是否是纯工具调用请求消息（有 toolRequests 但 text 为空）
        const hasToolRequests = msg.toolRequests && msg.toolRequests.length > 0;
        const hasText = msg.text && msg.text.trim() !== '';
        const hasThinking = msg.thinking && msg.thinking.trim() !== '';
        
        if (hasToolRequests || hasThinking) {
          if (!hasText) {
            // 暂存，等待后续的 text 消息
            pendingAIMessage = {
              messageType: 'AI',
              text: '',
              thinking: msg.thinking,
              toolRequests: msg.toolRequests ? [...msg.toolRequests] : [],
              dateTime: msg.dateTime,
            };
          } else {
            // 有 toolRequests/thinking 也有 text，直接添加
            mergedMessages.push(msg);
          }
        } else {
          // 直接添加（有实际内容的 AI 消息）
          mergedMessages.push(msg);
        }
      }
    } else {
      // USER 消息直接添加
      mergedMessages.push(msg);
    }
  }

  // 如果还有待处理的 AI 消息，添加进去（可能没有后续的 text）
  if (pendingAIMessage) {
    mergedMessages.push(pendingAIMessage);
  }

  return mergedMessages;
};

/**
 * 处理会话消息列表
 * 包括过滤、排序、合并等操作
 */
export const processSessionMessages = (
  sessionMessages: SessionMessage[]
): { processedMessages: SessionMessage[]; toolResultMessages: SessionMessage[] } => {
  // 收集所有 TOOL_EXECUTION_RESULT 类型的消息
  const toolResultMessages = sessionMessages.filter(
    msg => msg.messageType === 'TOOL_EXECUTION_RESULT'
  );

  // 过滤掉 TOOL_EXECUTION_RESULT 类型，只保留 USER 和 AI 消息
  const filteredMessages = sessionMessages.filter(
    msg => msg.messageType !== 'TOOL_EXECUTION_RESULT'
  );

  // 按 parentId 排序消息
  const sortedMessages = filteredMessages.sort((a, b) => (a.parentId || 0) - (b.parentId || 0));

  // 合并连续的 AI 消息
  const mergedMessages = mergeConsecutiveAIMessages(sortedMessages);

  return { processedMessages: mergedMessages, toolResultMessages };
};
