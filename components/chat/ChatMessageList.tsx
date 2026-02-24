import { Flex, Typography, theme, Image } from 'antd';
import React from 'react';

import { renderMarkdown } from '@/components/MarkdownRenderer';
import { extractThinkingContent } from '@/lib/utils/thinkingUtils';
import {
    LoadingOutlined, ToolOutlined, FilePdfOutlined, VideoCameraOutlined, AudioOutlined
} from '@ant-design/icons';
import { Actions, Bubble, ThoughtChain, Think } from '@ant-design/x';
import type { ThoughtChainProps } from '@ant-design/x';
import type { ToolRequest, ToolResponse } from '@/lib/api/conversations';

import styles from './ChatMessageList.module.css';

const { Text } = Typography;

// 聊天消息类型定义
export interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  avatar?: string;
  isLoading?: boolean;
  displayContent?: string; // 用于打字机效果的显示内容
  thinking?: string; // 深度思考内容
  thinkingDuration?: number; // 深度思考耗时，单位为秒
  toolNames?: string[]; // 调用的工具名称列表（兼容旧格式）
  toolRequests?: ToolRequest[]; // 工具调用请求列表
  toolResults?: ToolResponse[]; // 工具调用结果列表
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
                  {msg.displayContent || msg.content}
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

              // 优先使用thinking字段，如果没有则从content中提取
              let thinkingText = msg.thinking;
              let remainingContent = msg.displayContent || msg.content;

              // 如果没有thinking字段，则尝试从content中提取
              if (!thinkingText) {
                const extracted = extractThinkingContent(
                  msg.displayContent || msg.content
                );
                thinkingText = extracted.thinkingText;
                remainingContent = extracted.remainingContent;
              }

              // 构建 ThoughtChain 的 items（仅用于工具调用）
              const thoughtChainItems: ThoughtChainProps['items'] = [];

              // 添加工具调用节点
              if (msg.toolRequests && msg.toolRequests.length > 0) {
                msg.toolRequests.forEach((toolReq) => {
                  // 查找对应的工具调用结果
                  const toolResult = msg.toolResults?.find(
                    (result) => result.id === toolReq.id
                  );

                  // 工具执行失败时不显示结果内容，仅更新状态
                  const toolContent = toolResult && !toolResult.isError ? (
                    <div className={styles.toolResult}>
                      <div className={styles.toolResultSuccess}>
                        {toolResult.text || '执行成功'}
                      </div>
                    </div>
                  ) : null;

                  thoughtChainItems.push({
                    key: `tool-${toolReq.id}`,
                    title: toolReq.name,
                    icon: <ToolOutlined />,
                    status: toolResult
                      ? toolResult.isError
                        ? 'error'
                        : 'success'
                      : 'loading',
                    collapsible: true,
                    content: toolContent,
                  });
                });
              }

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
                    <div className={styles.thoughtChainContainer}>
                      <ThoughtChain
                        items={thoughtChainItems}
                        defaultExpandedKeys={[]}
                      />
                    </div>
                  )}

                  {/* 消息内容 */}
                  {msg.displayContent && renderMarkdown(msg.displayContent, onPreview)}
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
