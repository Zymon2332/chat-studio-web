import React from 'react';
import { Think } from '@ant-design/x';
import { renderMarkdown } from '@/components/MarkdownRenderer';
import { extractThinkingContent } from '@/lib/utils/thinkingUtils';
import { parseToolRequests, parseToolResponses, removeAllTags } from '@/lib/utils/toolUtils';
import type { ChatMessage } from '../ChatMessageList';
import ToolChain from './ToolChain';

interface AssistantMessageProps {
  message: ChatMessage;
  onPreview?: (content: string) => void;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ message, onPreview }) => {
  // 优先使用字段值（历史消息），如果没有则从 content 中解析（流式消息）
  const thinkingText = message.thinking || extractThinkingContent(message.content).thinkingText;

  // 工具调用：优先使用字段值，否则从 content 解析
  const toolRequests = message.toolRequests || parseToolRequests(message.content);
  const toolResponses = message.toolResponses || parseToolResponses(message.content);

  // 清理显示内容：如果有 thinking 或 toolRequests 说明是历史消息，content 已经是清理过的
  // 否则需要从 content 中移除所有标签（流式消息）
  const hasHistoryFields = message.thinking || message.toolRequests || message.toolResponses;
  const displayContent = hasHistoryFields
    ? message.content
    : removeAllTags(message.content);

  return (
    <div>
      {/* 深度思考区域 */}
      {thinkingText && (
        <div>
          <Think blink defaultExpanded={false} title="深度思考">
            {renderMarkdown(thinkingText)}
          </Think>
        </div>
      )}

      {/* ThoughtChain 工具调用链式展示 */}
      <ToolChain toolRequests={toolRequests} toolResponses={toolResponses} />

      {/* 消息内容 */}
      {displayContent && (
        <div>
          {renderMarkdown(displayContent, onPreview)}
        </div>
      )}
    </div>
  );
};

export default React.memo(AssistantMessage);
