import { theme } from 'antd';
import React, { useMemo } from 'react';
import type { MessageInfo } from '@ant-design/x-sdk';

import { Bubble } from '@ant-design/x';

import styles from './ChatMessageList.module.css';
import AssistantMessage from './message-parts/AssistantMessage';
import LoadingIndicator from './message-parts/LoadingIndicator';
import MessageFooter from './message-parts/MessageFooter';
import UserMessage from './message-parts/UserMessage';

import type { ToolRequest, ToolResponse } from "@/lib/api/conversations";
// 聊天消息类型定义
export interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  avatar?: string;
  isLoading?: boolean;
  streamCompleted?: boolean;
  thinking?: string; // 深度思考内容
  toolRequests?: ToolRequest[]; // 工具调用请求
  toolResponses?: ToolResponse[]; // 工具调用结果
  contentType?: "IMAGE" | "VIDEO" | "AUDIO" | "PDF"; // 文件类型
  fileUrl?: string; // 文件链接
  dateTime?: string; // 消息时间
}

// 组件属性接口
export interface ChatMessageListProps {
  messages: MessageInfo<ChatMessage>[];
  onPreview?: (content: string) => void;
}

// 生成唯一 key
const generateMessageKey = (msg: ChatMessage, index: number): string => {
  if (msg.dateTime) {
    return `${msg.role}-${msg.dateTime}-${index}`;
  }
  return `${msg.role}-${index}-${msg.content.slice(0, 20)}`;
};

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  onPreview,
}) => {
  const { token } = theme.useToken();

  // 使用 useMemo 缓存 bubble items 配置
  const bubbleItems = useMemo(() => {
    return messages.map((messageInfo, index) => {
      const msg = messageInfo.message;
      const variant: "shadow" | "borderless" =
        msg.role === "user" ? "shadow" : "borderless";
      const isAssistantLoading =
        msg.role === "assistant" &&
        messageInfo.status === "loading" &&
        !msg.content;
      const isAssistantStreaming =
        msg.role === "assistant" &&
        (messageInfo.status === "loading" || messageInfo.status === "updating");

      return {
        key: messageInfo.id ?? generateMessageKey(msg, index),
        className: styles.bubbleItem,
        content: msg,
        role: msg.role,
        loading: isAssistantLoading || msg.isLoading,
        streaming: isAssistantStreaming,
        variant,
        styles: {
          content: {
            backgroundColor:
              msg.role === "user" ? token.colorPrimaryBg : "transparent",
          },
        },
      };
    });
  }, [messages, token.colorPrimaryBg]);

  // 用户消息渲染
  const renderUserContent = (content: unknown) => {
    const msg = content as ChatMessage;
    return <UserMessage message={msg} />;
  };

  // 用户消息底部
  const renderUserFooter = (content: unknown) => {
    const msg = content as ChatMessage;
    return <MessageFooter message={msg} showActions />;
  };

  // 助手消息渲染
  const renderAssistantContent = (content: unknown) => {
    const msg = content as ChatMessage;
    return <AssistantMessage message={msg} onPreview={onPreview} />;
  };

  // 助手消息底部
  const renderAssistantFooter = (content: unknown) => {
    const msg = content as ChatMessage;
    const shouldShowActions = msg.streamCompleted ?? !msg.isLoading;
    return <MessageFooter message={msg} showActions={shouldShowActions} />;
  };

  // 助手加载状态渲染
  const renderAssistantLoading = () => <LoadingIndicator />;

  return (
    <div className={styles.messageListWrapper}>
      <Bubble.List
        className={styles.bubbleList}
        autoScroll
        items={bubbleItems}
        role={{
          user: {
            placement: "end",
            contentRender: renderUserContent,
            footer: renderUserFooter,
            footerPlacement: "outer-end",
          },
          assistant: {
            placement: "start",
            loadingRender: renderAssistantLoading,
            contentRender: renderAssistantContent,
            footer: renderAssistantFooter,
            footerPlacement: "inner-start"
          },
        }}
      />
    </div>
  );
};

export default React.memo(ChatMessageList);
