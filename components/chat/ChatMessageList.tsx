import { Avatar, Flex, message, Typography, theme, Image } from 'antd';
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import classNames from 'classnames';

import { renderMarkdown } from '@/components/MarkdownRenderer';
import { extractThinkingContent } from '@/lib/utils/thinkingUtils';
import { extractAllToolNames, extractToolContent } from '@/lib/utils/toolUtils';
import {
    FileTextOutlined, FileImageOutlined, LoadingOutlined, RobotOutlined, ToolOutlined, UserOutlined,
    FilePdfOutlined, VideoCameraOutlined, AudioOutlined
} from '@ant-design/icons';
import { Actions, Bubble, Sources, Think } from '@ant-design/x';

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
  toolNames?: string[]; // 调用的工具名称列表
  contentType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'; // 文件类型
  fileUrl?: string; // 文件链接
}

export interface ChatMessageListRef {
  scrollToBottom: () => void;
}

// 组件属性接口
export interface ChatMessageListProps {
  messages: ChatMessage[];
  style?: React.CSSProperties;
  isViewingHistory?: boolean; // 是否正在查看历史消息
  onPreview?: (content: string) => void;
  onScroll?: (e: React.UIEvent<HTMLElement>) => void;
}

const ChatMessageList = forwardRef<ChatMessageListRef, ChatMessageListProps>(({ messages, onPreview, onScroll }, ref) => {
  const listRef = useRef<any>(null);
  const { token } = theme.useToken();

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      // 使用 autoScroll 属性自动滚动
    }
  }));

  return (
    <>
      <Bubble.List
        ref={listRef}
        className={styles.bubbleList}
        autoScroll
        onScroll={onScroll}
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
                         <Text ellipsis className={styles.fileName}>PDF文档</Text>
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

              // 处理工具调用内容
              let toolNamesFromContent: string[] = [];
              let finalContent = remainingContent;

              // 使用新的函数直接提取所有工具名称
              const extractedToolNames = extractAllToolNames(remainingContent);
              if (extractedToolNames.length > 0) {
                // 直接使用提取的工具名称
                toolNamesFromContent = extractedToolNames;
                // 移除工具标签后的内容
                const toolExtracted = extractToolContent(remainingContent);
                finalContent = toolExtracted.remainingContent;
              }

              // 合并工具名称：优先使用从内容中提取的，然后是字段中的
              const allToolNames = [
                ...toolNamesFromContent,
                ...(msg.toolNames || []),
              ].filter((name, index, arr) => arr.indexOf(name) === index); // 去重

              return (
                <div>
                  {/* 深度思考区域 */}
                  {thinkingText && (
                    <Think blink defaultExpanded={false} title={"深度思考"}>
                      {renderMarkdown(thinkingText)}
                    </Think>
                  )}

                  {/* 工具调用显示 */}
                  {allToolNames.length > 0 && (
                    <Sources
                      items={allToolNames.map((name) => ({
                        key: name,
                        title: name,
                        icon: <ToolOutlined />,
                      }))}
                      title="工具调用"
                    />
                  )}

                  {/* 消息内容 */}
                  {finalContent && renderMarkdown(finalContent, onPreview)}
                </div>
              );
            },
            footer: (messageContext: any) => (
              <Actions
                items={[
                  {
                    key: "copy",
                    label: "copy",
                    actionRender: () => {
                      return <Actions.Copy text={messageContext.content} />;
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
            ),
          },
        }}
      />
    </>
  );
});

export default React.memo(ChatMessageList);
