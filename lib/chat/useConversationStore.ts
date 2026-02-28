import { useCallback, useEffect, useMemo, useRef } from "react";
import { useXConversations, type ConversationData } from "@ant-design/x-sdk";
import {
  deleteSession,
  getSessionList,
  updateSessionTitle,
  type SessionItem,
} from "@/lib/api/conversations";

export interface ConversationViewModel {
  key: string;
  sessionTitle: string;
  updatedAt: number;
}

interface DeleteConversationsResult {
  deletedActive: boolean;
}

const mapSessionToConversation = (session: SessionItem): ConversationViewModel => ({
  key: session.sessionId,
  sessionTitle: session.sessionTitle,
  updatedAt: session.updatedAt,
});

const normalizeConversation = (
  conversation: ConversationData
): ConversationViewModel => {
  const data = conversation as ConversationData &
    Partial<Pick<ConversationViewModel, "sessionTitle" | "updatedAt">>;

  return {
    key: String(data.key ?? ""),
    sessionTitle: String(data.sessionTitle ?? "未命名会话"),
    updatedAt: Number(data.updatedAt ?? 0),
  };
};

export const useConversationStore = () => {
  const {
    conversations: rawConversations,
    activeConversationKey,
    setActiveConversationKey,
    setConversations,
  } = useXConversations({
    defaultConversations: [],
    defaultActiveConversationKey: "",
  });

  const conversations = useMemo(
    () => rawConversations.map(normalizeConversation),
    [rawConversations]
  );

  const activeConversationKeyRef = useRef(activeConversationKey);
  useEffect(() => {
    activeConversationKeyRef.current = activeConversationKey;
  }, [activeConversationKey]);

  const refreshConversations = useCallback(async () => {
    const sessionList = await getSessionList();
    const conversationList = sessionList.map(mapSessionToConversation);
    setConversations(conversationList);

    const currentActiveKey = activeConversationKeyRef.current;
    if (
      currentActiveKey &&
      !conversationList.some((conversation) => conversation.key === currentActiveKey)
    ) {
      setActiveConversationKey("");
    }

    return conversationList;
  }, [setActiveConversationKey, setConversations]);

  const selectConversation = useCallback(
    (key: string) => {
      setActiveConversationKey(key);
    },
    [setActiveConversationKey]
  );

  const clearActiveConversation = useCallback(() => {
    setActiveConversationKey("");
  }, [setActiveConversationKey]);

  const renameConversation = useCallback(
    async (conversationKey: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }
      await updateSessionTitle(conversationKey, trimmed);
      await refreshConversations();
    },
    [refreshConversations]
  );

  const deleteConversations = useCallback(
    async (conversationKeys: string | string[]): Promise<DeleteConversationsResult> => {
      const keys = Array.isArray(conversationKeys)
        ? conversationKeys
        : [conversationKeys];
      const deletedActive =
        !!activeConversationKey && keys.includes(activeConversationKey);

      await deleteSession(keys);
      await refreshConversations();

      if (deletedActive) {
        setActiveConversationKey("");
      }

      return { deletedActive };
    },
    [activeConversationKey, refreshConversations, setActiveConversationKey]
  );

  return {
    conversations,
    activeConversationKey,
    refreshConversations,
    selectConversation,
    clearActiveConversation,
    renameConversation,
    deleteConversations,
  };
};
