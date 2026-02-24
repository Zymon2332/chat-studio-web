"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

import { message as antdMessage, Splitter } from "antd";
import {
  getSessionList,
  SessionItem,
  getSessionMessages,
  SessionMessage,
  ToolRequest,
  ToolResponse,
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
import { removeToolTags } from "@/lib/utils/toolUtils";

import styles from "./page.module.css";

// 将 API 消息转换为组件消息格式
const convertSessionMessageToChatMessage = (
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

  // 从 toolRequests 提取工具名称列表
  const toolNames = sessionMessage.toolRequests?.map(tr => tr.name) || [];

  // 匹配工具调用结果
  const matchedToolResults: ToolResponse[] = toolResultMessages?.filter(
    tr => sessionMessage.toolRequests?.some(req => req.id === tr.toolResponse?.id)
  ).map(tr => tr.toolResponse!) || [];

  // 清理内容，移除<tool>和<result>标签
  const displayContent = removeToolTags(content);

  const chatMessage: ChatMessage = {
    content,
    displayContent: displayContent || undefined,
    role,
    avatar: role === 'user' ? '👤' : '🤖',
    thinking: sessionMessage.thinking,
    toolNames: toolNames.length > 0 ? toolNames : undefined,
    toolRequests: sessionMessage.toolRequests,
    toolResults: matchedToolResults.length > 0 ? matchedToolResults : undefined,
    dateTime: sessionMessage.dateTime,
  };

  // 如果是 USER 消息且包含非 TEXT 类型的内容，添加文件相关信息
  if (sessionMessage.messageType === 'USER' && sessionMessage.contents) {
    const fileContent = sessionMessage.contents.find(c => c.contentType !== 'TEXT');
    if (fileContent) {
      chatMessage.fileUrl = fileContent.text;
      chatMessage.contentType = fileContent.contentType as any;
    }
  }

  return chatMessage;
};

const ChatPage: React.FC = () => {
  const { userInfo } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  // 用于控制 Sender 输入框的值
  const [inputValue, setInputValue] = useState("");

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
      const sessions = await getSessionList();
      setSessions(sessions);
    } catch (error) {
      console.error("加载会话列表失败:", error);
    }
  };

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

  // 加载会话消息
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionMessages = await getSessionMessages(sessionId);
      
      // 收集所有 TOOL_EXECUTION_RESULT 类型的消息
      const toolResultMessages = sessionMessages.filter(
        msg => msg.messageType === 'TOOL_EXECUTION_RESULT'
      );

      // 过滤掉 TOOL_EXECUTION_RESULT 类型，只保留 USER 和 AI 消息
      const filteredMessages = sessionMessages.filter(
        msg => msg.messageType !== 'TOOL_EXECUTION_RESULT'
      );
      
      // 按 parentId 排序消息，确保消息顺序正确
      const sortedMessages = filteredMessages.sort((a, b) => (a.parentId || 0) - (b.parentId || 0));
      
      // 处理消息：收集所有工具调用请求，然后合并到后面的 AI 回复消息
      const processedMessages: SessionMessage[] = [];
      const pendingToolRequests: ToolRequest[] = [];
      
      for (let i = 0; i < sortedMessages.length; i++) {
        const msg = sortedMessages[i];
        
        // 检查是否是纯工具调用请求消息（AI 类型、有 toolRequests、且 text 为空或只有空白字符）
        const isToolOnlyMessage = msg.messageType === 'AI' && 
                                  msg.toolRequests && 
                                  msg.toolRequests.length > 0 &&
                                  (!msg.text || msg.text.trim() === '');
        
        if (isToolOnlyMessage) {
          // 收集工具调用请求，暂不添加到 processedMessages
          if (msg.toolRequests) {
            pendingToolRequests.push(...msg.toolRequests);
          }
        } else {
          // 如果是有实际内容的 AI 消息，且有待处理的工具调用请求，则合并
          if (msg.messageType === 'AI' && msg.text && msg.text.trim() !== '' && pendingToolRequests.length > 0) {
            // 合并工具调用请求到当前 AI 消息
            const existingToolNames = new Set(msg.toolRequests?.map(tr => tr.name) || []);
            pendingToolRequests.forEach(tr => {
              if (!existingToolNames.has(tr.name)) {
                if (!msg.toolRequests) {
                  msg.toolRequests = [];
                }
                msg.toolRequests.push(tr);
                existingToolNames.add(tr.name);
              }
            });
            // 清空待处理的工具调用请求
            pendingToolRequests.length = 0;
          }
          processedMessages.push(msg);
        }
      }
      
      // 如果遍历结束后还有未合并的工具调用请求，作为独立消息添加
      if (pendingToolRequests.length > 0) {
        // 创建一个工具调用请求消息
        const toolOnlyMessage: SessionMessage = {
          messageType: 'AI',
          text: '',
          toolRequests: pendingToolRequests,
        };
        processedMessages.push(toolOnlyMessage);
      }
      
      // useXChat 需要 MessageInfo<T> 格式
      const messageInfos = processedMessages.map((msg, index) => ({
        id: index.toString(),
        message: convertSessionMessageToChatMessage(msg, toolResultMessages),
        status: 'success' as const
      }));

      setMessages(messageInfos);
      return processedMessages.map(m => convertSessionMessageToChatMessage(m, toolResultMessages));
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
                  <div className={styles.messageListContainer}>
                    {displayMessages.length === 0 ? (
                      <ChatWelcome userName={userInfo?.nickName} />
                    ) : (
                      <ChatMessageList
                        messages={displayMessages}
                        onPreview={handlePreview}
                      />
                    )}
                  </div>
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
                    showGradientOverlay={displayMessages.length > 0}
                  />
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
        }}
      />
    </div>
  );
};

export default ChatPage;
