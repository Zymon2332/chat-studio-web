"use client";

import React, { useState, useEffect } from "react";
import { Splitter, Skeleton } from "antd";
import SessionManageModal from "@/components/SessionManageModal";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatWelcome from "@/components/chat/ChatWelcome";
import PreviewPanel from "@/components/chat/PreviewPanel";
import { useUser } from "@/contexts/UserContext";
import { useChatPageController } from "@/lib/chat/useChatPageController";

import styles from "./page.module.css";

const ChatPage: React.FC = () => {
  const { userInfo } = useUser();
  const [collapsed, setCollapsed] = useState(true);
  const [sessionManageModalVisible, setSessionManageModalVisible] =
    useState(false);
  const [panelSizes, setPanelSizes] = useState<(number | string)[]>(["100%"]);

  const {
    conversations,
    activeConversationKey,
    messages,
    isSessionMessagesLoading,
    inputValue,
    setInputValue,
    sendingLoading,
    selectedModel,
    setSelectedModel,
    defaultModel,
    modelList,
    previewContent,
    previewVisible,
    setPreviewVisible,
    onAddConversation,
    onConversationSelect,
    onSendMessage,
    onPreview,
    onRenameConversation,
    onDeleteConversations,
    handleCancel,
  } = useChatPageController();

  useEffect(() => {
    setPanelSizes(previewVisible ? ["60%", "40%"] : ["100%"]);
  }, [previewVisible]);

  return (
    <div className={styles.pageContainer}>
      <ChatSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        sessions={conversations}
        selectedId={activeConversationKey}
        onSettingsClick={() => setSessionManageModalVisible(true)}
        onConversationSelect={onConversationSelect}
        onAddConversation={onAddConversation}
        onRenameConversation={onRenameConversation}
        onDeleteConversation={onDeleteConversations}
      />

      <div className={styles.chatArea}>
        <Splitter
          className={styles.splitter}
          layout="horizontal"
          onResize={setPanelSizes}
        >
          <Splitter.Panel size={panelSizes[0]} min="40%" max="80%">
            <div className={styles.splitterPanel}>
              {isSessionMessagesLoading ? (
                <div className={styles.sessionLoadingState}>
                  <div className={styles.chatSkeleton}>
                    <Skeleton
                      active
                      title={{ width: "34%" }}
                      paragraph={{ rows: 2 }}
                    />
                    <Skeleton
                      active
                      title={{ width: "28%" }}
                      paragraph={{ rows: 3 }}
                    />
                    <Skeleton
                      active
                      title={{ width: "40%" }}
                      paragraph={{ rows: 2 }}
                    />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <ChatWelcome userName={userInfo?.nickName} />
              ) : (
                <ChatMessageList messages={messages} onPreview={onPreview} />
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

      <SessionManageModal
        open={sessionManageModalVisible}
        onCancel={() => setSessionManageModalVisible(false)}
        conversations={conversations}
        selectedSessionId={activeConversationKey}
        onRenameConversation={onRenameConversation}
        onDeleteConversations={onDeleteConversations}
      />
    </div>
  );
};

export default ChatPage;
