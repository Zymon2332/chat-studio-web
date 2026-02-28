import { useCallback, useEffect, useState } from "react";
import {
  getDefaultModel,
  type DefaultModel,
  type ModelListItem,
  type ModelProviderWithModels,
  getModelList,
} from "@/lib/api/models";
import { loginEventManager } from "@/lib/events/loginEvents";
import { modelEventManager } from "@/lib/events/modelEvents";
import { useChat } from "@/lib/hooks/useChat";
import { useConversationStore } from "@/lib/chat/useConversationStore";

export const useChatPageController = () => {
  const {
    conversations,
    activeConversationKey,
    refreshConversations,
    selectConversation,
    clearActiveConversation,
    renameConversation,
    deleteConversations,
  } = useConversationStore();

  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelListItem | null>(null);
  const [defaultModel, setDefaultModel] = useState<DefaultModel | null>(null);
  const [modelList, setModelList] = useState<ModelProviderWithModels[]>([]);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewVisible, setPreviewVisible] = useState(false);

  const {
    messages,
    setMessages,
    setSessionId,
    sessionMessagesLoading,
    loadMessagesBySession,
    cancelSessionMessagesLoading,
    sendingLoading,
    handleSubmit,
    handleCancel,
  } = useChat({
    initialSessionId: null,
    onSessionCreated: async (newSessionId) => {
      await refreshConversations();
      selectConversation(newSessionId);
    },
  });

  const loadModelList = useCallback(async () => {
    const list = await getModelList();
    setModelList(list);
  }, []);

  const loadDefaultModel = useCallback(async () => {
    const model = await getDefaultModel();
    setDefaultModel(model);
  }, []);

  const clearChatState = useCallback(() => {
    handleCancel();
    clearActiveConversation();
    setSessionId(null);
    setMessages([]);
    setInputValue("");
    setPreviewVisible(false);
    cancelSessionMessagesLoading();
  }, [
    cancelSessionMessagesLoading,
    clearActiveConversation,
    handleCancel,
    setMessages,
    setSessionId,
  ]);

  const onAddConversation = useCallback(() => {
    clearChatState();
  }, [clearChatState]);

  const onConversationSelect = useCallback(
    async (conversationKey: string) => {
      if (conversationKey === activeConversationKey) {
        return;
      }

      handleCancel();
      selectConversation(conversationKey);
      setPreviewVisible(false);
      await loadMessagesBySession(conversationKey);
    },
    [activeConversationKey, handleCancel, loadMessagesBySession, selectConversation]
  );

  const onSendMessage = useCallback(
    (
      value: string,
      uploadId?: string,
      contentType?: string,
      fileUrl?: string
    ) => {
      handleSubmit(
        value,
        selectedModel || defaultModel,
        uploadId,
        contentType,
        fileUrl
      );
      setInputValue("");
    },
    [defaultModel, handleSubmit, selectedModel]
  );

  const onPreview = useCallback((content: string) => {
    setPreviewContent(content);
    setPreviewVisible(true);
  }, []);

  const onRenameConversation = useCallback(
    async (conversationKey: string, title: string) => {
      await renameConversation(conversationKey, title);
    },
    [renameConversation]
  );

  const onDeleteConversations = useCallback(
    async (conversationKeys: string[]) => {
      const { deletedActive } = await deleteConversations(conversationKeys);
      if (deletedActive) {
        clearChatState();
      }
    },
    [clearChatState, deleteConversations]
  );

  useEffect(() => {
    refreshConversations();
    loadDefaultModel();
    loadModelList();
  }, [loadDefaultModel, loadModelList, refreshConversations]);

  useEffect(() => {
    const unsubscribe = loginEventManager.onLoginSuccess(() => {
      refreshConversations();
      loadDefaultModel();
    });
    return unsubscribe;
  }, [loadDefaultModel, refreshConversations]);

  useEffect(() => {
    const unsubscribe = modelEventManager.onModelChange(() => {
      loadDefaultModel();
      loadModelList();
    });
    return unsubscribe;
  }, [loadDefaultModel, loadModelList]);

  return {
    conversations,
    activeConversationKey,
    messages,
    isSessionMessagesLoading: sessionMessagesLoading,
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
    clearChatState,
    onAddConversation,
    onConversationSelect,
    onSendMessage,
    onPreview,
    refreshConversations,
    onRenameConversation,
    onDeleteConversations,
    handleCancel,
  };
};
