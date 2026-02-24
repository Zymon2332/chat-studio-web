import { Flex, Typography, theme, Image } from 'antd';
import React from 'react';

import { renderMarkdown } from '@/components/MarkdownRenderer';
import { extractThinkingContent } from '@/lib/utils/thinkingUtils';
import { parseToolRequests, parseToolResponses, removeAllTags } from '@/lib/utils/toolUtils';
import type { ToolRequest, ToolResponse } from '@/lib/api/conversations';
import {
    LoadingOutlined, ToolOutlined, FilePdfOutlined, VideoCameraOutlined, AudioOutlined
} from '@ant-design/icons';
import { Actions, Bubble, ThoughtChain, Think } from '@ant-design/x';

import styles from './ChatMessageList.module.css';

const { Text } = Typography;

// 聊天消息类型定义
export interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  avatar?: string;
  isLoading?: boolean;
  thinking?: string; // 深度思考内容（历史消息）
  toolRequests?: ToolRequest[]; // 工具调用请求（历史消息）
  toolResults?: ToolResponse[]; // 工具调用结果（历史消息）
  contentType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'; // 文件类型
  fileUrl?: string; // 文件链接
  dateTime?: string; // 消息时间
}

// 组件属性接口
export interface ChatMessageListProps {
  messages: ChatMessage[];
  onPreview?: (content: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, onPreview }) => {
  const { token } = theme.useToken();

  return (
    <div className={styles.messageListWrapper}>
      <Bubble.List
        className={styles.bubbleList}
        autoScroll
        items={messages.map((msg, index) => ({
          key: index,
          className: styles.bubbleItem,
          content: { ...msg, messageIndex: index },
          role: msg.role,
          loading: msg.isLoading,
          variant: msg.role === 'user' ? "shadow" : 'borderless',
          styles: {
            content: {
              backgroundColor: msg.role === 'user' ? token.colorPrimaryBg : 'transparent',
            }
          }
        }))}
        role={{
          user: {
            placement: "end",
            contentRender: (content: any) => {
              const msg = content as ChatMessage & { messageIndex: number };
              
              // 渲染文件内容
              const renderFileContent = () => {
                if (!msg.contentType || !msg.fileUrl) return null;
                
                switch (msg.contentType) {
                  case 'IMAGE':
                    return (
                      <div className={styles.imageContainer}>
                        <Image
                          src={msg.fileUrl}
                          alt="Uploaded Image"
                          className={styles.image}
                        />
                      </div>
                    );
                  case 'VIDEO':
                    return (
                      <div className={styles.filePlaceholder}>
                         <VideoCameraOutlined className={styles.videoIcon} />
                         <Text ellipsis className={styles.fileName}>视频文件</Text>
                      </div>
                    );
                  case 'AUDIO':
                    return (
                      <div className={styles.filePlaceholder}>
                         <AudioOutlined className={styles.audioIcon} />
                         <Text ellipsis className={styles.fileName}>音频文件</Text>
                      </div>
                    );
                  case 'PDF':
                    return (
                      <div className={styles.filePlaceholder}>
                         <FilePdfOutlined className={styles.pdfIcon} />
                         <Text ellipsis className={styles.fileName}>PDF 文档</Text>
                      </div>
                    );
                  default:
                    return null;
                }
              };

              return (
                <div className={styles.messageContent}>
                  {renderFileContent()}
                  {msg.content}
                </div>
              );
            },
            footer: (msg: any) => (
              <div className={styles.messageFooter}>
                {msg.dateTime && <span className={styles.dateTime}>{msg.dateTime}</span>}
              </div>
            ),
          },
          assistant: {
            placement: "start",
            loadingRender: () => (
              <Flex align="center" gap="small" className={styles.assistantLoading}>
                <LoadingOutlined spin style={{ fontSize: 16 }} />
                <span className={styles.thinkingText}>Thinking...</span>
              </Flex>
            ),
            contentRender: (content: any) => {
              const msg = content as ChatMessage & { messageIndex: number };

              // 优先使用字段值（历史消息），如果没有则从 content 中解析（流式消息）
              const thinkingText = msg.thinking || extractThinkingContent(msg.content).thinkingText;
              
              // 工具调用：优先使用字段值，否则从 content 解析
              const toolRequests = msg.toolRequests || parseToolRequests(msg.content);
              const toolResults = msg.toolResults || parseToolResponses(msg.content);

              // 构建 ThoughtChain items
              const thoughtChainItems = toolRequests.map((toolReq) => {
                const toolResult = toolResults.find(
                  (result) => result.id === toolReq.id
                );

                const toolContent = toolResult && !toolResult.isError ? (
                  <div className={styles.toolResult}>
                    <div className={styles.toolResultSuccess}>
                      {toolResult.text || '执行成功'}
                    </div>
                  </div>
                ) : null;

                return {
                  key: `tool-${toolReq.id}`,
                  title: toolReq.name,
                  icon: <ToolOutlined />,
                  status: (toolResult
                    ? toolResult.isError
                      ? 'error'
                      : 'success'
                    : 'loading') as 'loading' | 'success' | 'error',
                  collapsible: true,
                  content: toolContent,
                };
              });

              // 清理显示内容：如果有 thinking 或 toolRequests 说明是历史消息，content 已经是清理过的
              // 否则需要从 content 中移除所有标签（流式消息）
              const hasHistoryFields = msg.thinking || msg.toolRequests || msg.toolResults;
              const displayContent = hasHistoryFields
                ? msg.content
                : removeAllTags(msg.content);

              return (
                <div>
                  {/* 深度思考区域 */}
                  {thinkingText && (
                    <div className={styles.thinkingContainer}>
                      <Think blink defaultExpanded={false} title="深度思考">
                        {renderMarkdown(thinkingText)}
                      </Think>
                    </div>
                  )}

                  {/* ThoughtChain 工具调用链式展示 */}
                  {thoughtChainItems.length > 0 && (
                    <ThoughtChain
                      items={thoughtChainItems}
                      defaultExpandedKeys={[]}
                    />
                  )}

                  {/* 消息内容 */}
                  {displayContent && renderMarkdown(displayContent, onPreview)}
                </div>
              );
            },
            footer: (msg: any) => (
              <div className={styles.messageFooter}>
                <Actions
                  items={[
                    {
                      key: "copy",
                      label: "copy",
                      actionRender: () => {
                        return <Actions.Copy text={msg.content} />;
                      },
                    },
                    {
                      key: "feedback",
                      actionRender: () => (
                        <Actions.Feedback
                          styles={{
                            liked: {
                              color: "#f759ab",
                            },
                          }}
                          key="feedback"
                        />
                      ),
                    },
                  ]}
                />
                {msg.dateTime && <span className={styles.dateTime}>{msg.dateTime}</span>}
              </div>
            ),
          },
        }}
      />
    </div>
  );
};

export default React.memo(ChatMessageList);
