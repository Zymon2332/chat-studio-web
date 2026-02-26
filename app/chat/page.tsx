"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { message as antdMessage, Splitter } from "antd";
import {
  getSessionList,
  SessionItem,
  getSessionMessages,
  SessionMessage,
} from "@/lib/api/conversations";
import SessionManageModal from "@/components/SessionManageModal";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import ChatMessageList, { ChatMessage } from "@/components/chat/ChatMessageList";
import ChatWelcome from "@/components/chat/ChatWelcome";
import PreviewPanel from "@/components/chat/PreviewPanel";
import { useUser } from "@/contexts/UserContext";
import {
  getDefaultModel,
  DefaultModel,
  ModelListItem,
  ModelProviderWithModels,
  getModelList,
} from "@/lib/api/models";
import { loginEventManager } from "@/lib/events/loginEvents";
import { modelEventManager } from "@/lib/events/modelEvents";
import { useChat } from "@/lib/hooks/useChat";
import {
  convertSessionMessageToChatMessage,
  processSessionMessages,
} from "@/lib/utils/messageConverter";

import styles from "./page.module.css";

const ChatPage: React.FC = () => {
  const { userInfo } = useUser();
  const [collapsed, setCollapsed] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [sessionManageModalVisible, setSessionManageModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelListItem | null>(null);
  const [defaultModel, setDefaultModel] = useState<DefaultModel | null>(null);
  const [modelList, setModelList] = useState<ModelProviderWithModels[]>([]);

  // 预览相关状态
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewVisible, setPreviewVisible] = useState(false);

  // Splitter 面板大小控制
  const [panelSizes, setPanelSizes] = useState<(number | string)[]>(['100%']);

  useEffect(() => {
    setPanelSizes(previewVisible ? ['60%', '40%'] : ['100%']);
  }, [previewVisible]);

  // 使用自定义 Hook 管理聊天逻辑
  const {
    messages,
    setMessages,
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

  // 加载会话列表
  const loadSessionList = useCallback(async () => {
    try {
      const sessions = await getSessionList();
      setSessions(sessions);
    } catch (error) {
      console.error("加载会话列表失败:", error);
    }
  }, []);

  // 加载模型列表
  const loadModelList = useCallback(async () => {
    try {
      const list = await getModelList();
      setModelList(list);
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  }, []);

  // 加载默认模型
  const loadDefaultModel = useCallback(async () => {
    try {
      const model = await getDefaultModel();
      setDefaultModel(model);
    } catch (error) {
      console.error("加载默认模型失败:", error);
    }
  }, []);

  // 加载会话消息
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const sessionMessages = await getSessionMessages(sessionId);
      const processedMessages = processSessionMessages(sessionMessages);

      // 转换为 MessageInfo<T> 格式
      const messageInfos = processedMessages.map((msg: SessionMessage, index: number) => ({
        id: index.toString(),
        message: convertSessionMessageToChatMessage(msg),
        status: 'success' as const
      }));

      setMessages(messageInfos);
      return processedMessages.map((m: SessionMessage) => convertSessionMessageToChatMessage(m));
    } catch (error) {
      console.error("加载会话消息失败:", error);
      throw error;
    }
  }, [setMessages]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadSessionList();
    loadDefaultModel();
    loadModelList();
  }, [loadSessionList, loadDefaultModel, loadModelList]);

  // 监听登录成功事件
  useEffect(() => {
    const unsubscribe = loginEventManager.onLoginSuccess(() => {
      loadSessionList();
      loadDefaultModel();
    });
    return unsubscribe;
  }, [loadSessionList, loadDefaultModel]);

  // 监听模型变更事件
  useEffect(() => {
    const unsubscribe = modelEventManager.onModelChange(() => {
      loadDefaultModel();
      loadModelList();
    });
    return unsubscribe;
  }, [loadDefaultModel, loadModelList]);

  // 清理聊天状态
  const clearChatState = useCallback(() => {
    handleCancel();
    setSelectedId("");
    setSessionId(null);
    setMessages([]);
    setInputValue("");
    setPreviewVisible(false);
  }, [handleCancel, setSessionId, setMessages]);

  // 新建对话
  const handleAddConversation = useCallback(() => {
    clearChatState();
  }, [clearChatState]);

  // 发送消息
  const onSendMessage = useCallback((
    val: string,
    uploadId?: string,
    contentType?: string,
    fileUrl?: string
  ) => {
    handleSubmit(val, selectedModel || defaultModel, uploadId, contentType, fileUrl);
    setInputValue("");
  }, [handleSubmit, selectedModel, defaultModel]);

  // 处理预览
  const handlePreview = useCallback((content: string) => {
    setPreviewContent(content);
    setPreviewVisible(true);
  }, []);

  // 处理会话选择
  const handleConversationSelect = useCallback(async (key: string) => {
    try {
      handleCancel();
      setSelectedId(key);
      setSessionId(key);
      setPreviewVisible(false);
      await loadSessionMessages(key);
    } catch (error) {
      console.error("切换会话失败:", error);
      antdMessage.error("切换会话失败，请重试");
      setMessages([]);
    }
  }, [handleCancel, setSessionId, loadSessionMessages, setMessages]);

  return (
    <div className={styles.pageContainer}>
      {/* 左侧对话管理区 */}
      <ChatSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        sessions={sessions}
        selectedId={selectedId}
        onSettingsClick={() => setSessionManageModalVisible(true)}
        onConversationSelect={handleConversationSelect}
        onAddConversation={handleAddConversation}
        onSessionsChange={loadSessionList}
        onSelectedSessionDeleted={clearChatState}
      />

      {/* 右侧聊天区 */}
      <div className={styles.chatArea}>
        <Splitter
          className={styles.splitter}
          layout="horizontal"
          onResize={setPanelSizes}
        >
          <Splitter.Panel size={panelSizes[0]} min="40%" max="80%">
            <div className={styles.splitterPanel}>
              {displayMessages.length === 0 ? (
                <ChatWelcome userName={userInfo?.nickName} />
              ) : (
                <ChatMessageList
                  messages={displayMessages}
                  onPreview={handlePreview}
                />
              )}
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
          </Splitter.Panel>
          {previewVisible && (
            <Splitter.Panel size={panelSizes[1]} min="20%">
              <PreviewPanel
                content={previewContent}
                onClose={() => setPreviewVisible(false)}
              />
            </Splitter.Panel>
          )}
        </Splitter>
      </div>

      {/* 会话管理模态框 */}
      <SessionManageModal
        open={sessionManageModalVisible}
        onCancel={() => setSessionManageModalVisible(false)}
        onSessionsChange={loadSessionList}
        selectedSessionId={selectedId}
        onSelectedSessionDeleted={clearChatState}
      />
    </div>
  );
};

export default ChatPage;
