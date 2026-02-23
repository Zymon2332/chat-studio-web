"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

import {
  ArrowDownOutlined,
} from "@ant-design/icons";
import { message as antdMessage, Splitter, FloatButton } from "antd";
import {
  getSessionList,
  SessionItem,
  getSessionMessages,
  SessionMessage,
} from "@/lib/api/conversations";
import SessionManageModal from "@/components/SessionManageModal";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import ChatMessageList, { ChatMessage, ChatMessageListRef } from "@/components/chat/ChatMessageList";
import ChatWelcome from "@/components/chat/ChatWelcome";
import PreviewPanel from "@/components/chat/PreviewPanel";
import { useUser } from "@/contexts/UserContext";
import {
  getDefaultModel,
  DefaultModel,
  ModelListItem,
  setDefaultModel as setDefaultModelAPI,
  ModelProviderWithModels,
  getModelList,
} from "@/lib/api/models";
import { loginEventManager } from "@/lib/events/loginEvents";
import { modelEventManager } from "@/lib/events/modelEvents";
import { useChat } from "@/lib/hooks/useChat";

import styles from "./page.module.css";

// 将 API 消息转换为组件消息格式
const convertSessionMessageToChatMessage = (
  sessionMessage: SessionMessage
): ChatMessage => {
  const chatMessage: ChatMessage = {
    content: sessionMessage.message,
    role: sessionMessage.messageType === "USER" ? "user" : "assistant",
    avatar: sessionMessage.messageType === "USER" ? "👤" : "🤖",
    modelName: sessionMessage.modelName,
  };

  // 如果是 USER 消息且包含 content 字段，添加文件相关信息
  if (sessionMessage.messageType === "USER" && sessionMessage.content) {
    chatMessage.fileUrl = sessionMessage.content.content;
    chatMessage.contentType = sessionMessage.content.contentType;
  }

  // 如果是 AI 消息且包含工具调用信息，添加 toolNames 字段
  if (
    sessionMessage.messageType === "ASSISTANT" &&
    sessionMessage.toolNames &&
    sessionMessage.toolNames.length > 0
  ) {
    chatMessage.toolNames = sessionMessage.toolNames;
  }

  return chatMessage;
};

const ChatPage: React.FC = () => {
  const { userInfo } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  
  const chatListRef = useRef<ChatMessageListRef>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // 用于控制 Sender 输入框的值
  const [inputValue, setInputValue] = useState(""); 
  
  const [loading, setLoading] = useState<boolean>(true);
  
  const [sessionManageModalVisible, setSessionManageModalVisible] =
    useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<ModelListItem | null>(
    null
  );
  const [defaultModel, setDefaultModel] = useState<DefaultModel | null>(null);
  const [modelList, setModelList] = useState<ModelProviderWithModels[]>([]);

  // 预览相关状态
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewVisible, setPreviewVisible] = useState(false);

  // 处理预览
  const handlePreview = useCallback((content: string) => {
    setPreviewContent(content);
    setPreviewVisible(true);
  }, []);

  // Splitter 面板大小控制
  const [panelSizes, setPanelSizes] = useState<(number | string)[]>(['100%']);

  useEffect(() => {
    if (previewVisible) {
      setPanelSizes(['60%', '40%']);
    } else {
      setPanelSizes(['100%']);
    }
  }, [previewVisible]);

  // 加载会话列表
  const loadSessionList = async () => {
    try {
      setLoading(true);
      const sessions = await getSessionList();
      setSessions(sessions);
    } catch (error) {
      console.error("加载会话列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 使用自定义 Hook 管理聊天逻辑
  const {
    messages,
    setMessages,
    sessionId,
    setSessionId,
    sendingLoading,
    handleSubmit,
    handleCancel,
  } = useChat({
    initialSessionId: null,
    onSessionCreated: async (newSessionId) => {
      try {
        await loadSessionList();
        setSelectedId(newSessionId);
      } catch (error) {
        console.warn("刷新会话列表失败:", error);
      }
    },
  });

  // 转换消息列表，使用 useMemo 优化性能
  const displayMessages = useMemo(() => {
    return messages.map(m => m.message);
  }, [messages]);

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionMessages = await getSessionMessages(sessionId);
      // 按照 parentId 关系排序消息，确保消息顺序正确
      const sortedMessages = sessionMessages.sort((a, b) => a.id - b.id);
      
      // useXChat 需要 MessageInfo<T> 格式
      const messageInfos = sortedMessages.map(msg => ({
        id: msg.id.toString(),
        message: convertSessionMessageToChatMessage(msg),
        status: 'success' as const
      }));
      
      setMessages(messageInfos);
      return sortedMessages.map(convertSessionMessageToChatMessage);
    } catch (error) {
      console.error("加载会话消息失败:", error);
      throw error;
    }
  };

  // 加载模型列表
  const loadModelList = async () => {
    try {
      const list = await getModelList();
      setModelList(list);
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  };

  // 加载默认模型
  const loadDefaultModel = async () => {
    try {
      const model = await getDefaultModel();
      setDefaultModel(model);
    } catch (error) {
      console.error("加载默认模型失败:", error);
    }
  };

  // 组件挂载时加载会话列表和默认模型
  useEffect(() => {
    loadSessionList();
    loadDefaultModel();
    loadModelList();
  }, []);

  // 监听登录成功事件，自动刷新会话列表和默认模型
  useEffect(() => {
    const unsubscribe = loginEventManager.onLoginSuccess(() => {
      loadSessionList();
      loadDefaultModel();
    });

    return unsubscribe;
  }, []);

  // 监听模型变更事件，自动刷新默认模型和模型列表
  useEffect(() => {
    const unsubscribe = modelEventManager.onModelChange(() => {
      loadDefaultModel();
      loadModelList();
    });

    return unsubscribe;
  }, []);

  // 新建对话逻辑：切换到初始聊天状态
  const handleAddConversation = () => {
    handleCancel();
    setSelectedId("");
    setSessionId(null);
    setMessages([]);
    setInputValue("");
    setPreviewVisible(false);
    setShowScrollToBottom(false);
  };

  // 滚动监听
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // 处理负值 scrollTop (通常出现在某些浏览器的 column-reverse 布局中)
    // 如果 scrollTop <= 0，说明使用了反向滚动，0 通常是底部
    // 注意：如果是标准滚动，0 是顶部。为了兼容反向滚动的底部检测，我们在 0 时也隐藏按钮
    // 这是一个权衡：标准滚动的顶部也不会显示回到底部按钮，这通常是可以接受的
    if (scrollTop <= 0) {
      if (Math.abs(scrollTop) > 100) {
        setShowScrollToBottom(true);
      } else {
        setShowScrollToBottom(false);
      }
      return;
    }

    // 标准滚动逻辑
    // 当距离底部超过 100px 时显示按钮
    if (scrollHeight > clientHeight && scrollHeight - scrollTop - clientHeight > 100) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }
  };

  const scrollToBottom = () => {
    chatListRef.current?.scrollToBottom();
  };

  const onSendMessage = (val: string, uploadId?: string, contentType?: string, fileUrl?: string) => {
    handleSubmit(val, selectedModel || defaultModel, uploadId, contentType, fileUrl);
    setInputValue("");
  };

  return (
    <div className={styles.pageContainer}>
      {/* 左侧对话管理区 */}
      <ChatSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        sessions={sessions}
        selectedId={selectedId}
        onSettingsClick={() => setSessionManageModalVisible(true)}
        onConversationSelect={async (key) => {
          try {
            handleCancel();
            setSelectedId(key);
            setSessionId(key);
            setPreviewVisible(false);
            setShowScrollToBottom(false);
            await loadSessionMessages(key);
          } catch (error) {
            console.error("切换会话失败:", error);
            antdMessage.error("切换会话失败，请重试");
            setMessages([]);
          }
        }}
        onAddConversation={handleAddConversation}
        onSessionsChange={loadSessionList}
        onSelectedSessionDeleted={() => {
          handleCancel();
          setSelectedId("");
          setSessionId(null);
          setMessages([]);
        }}
      />
      {/* 右侧聊天区 */}
      <div className={styles.chatArea}>
        <div className={styles.chatContent}>
          <Splitter className={styles.splitter} onResize={setPanelSizes}>
              <Splitter.Panel size={panelSizes[0]} min="40%">
                <div className={styles.splitterPanel}>
                  {displayMessages.length === 0 ? (
                    <ChatWelcome userName={userInfo?.nickName} />
                  ) : (
                    <div className={styles.messageListContainer}>
                      <ChatMessageList
                        ref={chatListRef}
                        messages={displayMessages}
                        isViewingHistory={!!selectedId}
                        onPreview={handlePreview}
                        onScroll={handleScroll}
                      />
                      {showScrollToBottom && (
                        <FloatButton
                          icon={<ArrowDownOutlined />}
                          onClick={scrollToBottom}
                          style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 24 }}
                        />
                      )}
                    </div>
                  )}
                  <div className={styles.bottomSenderWrapper}>
                    <div className={styles.bottomSenderContainer}>
                      <ChatMessageInput
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={onSendMessage}
                        loading={sendingLoading}
                        onCancel={handleCancel}
                        selectedModel={selectedModel}
                        defaultModel={defaultModel}
                        modelList={modelList}
                        onModelSelect={setSelectedModel}
                      />
                    </div>
                  </div>
                </div>
              </Splitter.Panel>
              {previewVisible && (
                <Splitter.Panel size={panelSizes[1]}>
                  <PreviewPanel
                    content={previewContent}
                    onClose={() => setPreviewVisible(false)}
                  />
                </Splitter.Panel>
              )}
            </Splitter>
          </div>
       </div>

      {/* 会话管理模态框 */}
      <SessionManageModal
        open={sessionManageModalVisible}
        onCancel={() => setSessionManageModalVisible(false)}
        onSessionsChange={loadSessionList}
        selectedSessionId={selectedId}
        onSelectedSessionDeleted={() => {
          handleCancel();
          setSelectedId("");
          setSessionId(null);
          setMessages([]);
          setPreviewVisible(false);
          setShowScrollToBottom(false);
        }}
      />
    </div>
  );
};

export default ChatPage;
