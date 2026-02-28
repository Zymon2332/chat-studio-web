import { useState, useCallback, useEffect, useRef } from "react";
import {
  useXChat,
  type MessageInfo,
  type AbstractXRequestClass,
  type SSEOutput,
} from "@ant-design/x-sdk";
import { ChatMessage } from "@/components/chat/ChatMessageList";
import {
  ChatRequest,
  createSession,
  createChatStreamRequest,
  parseChatStreamChunk,
  getSessionMessages,
  type SessionMessage,
} from "@/lib/api/conversations";
import { ModelListItem, DefaultModel } from "@/lib/api/models";
import {
  convertSessionMessageToChatMessage,
  processSessionMessages,
} from "@/lib/utils/messageConverter";

interface UseChatProps {
  initialSessionId: string | null;
  onSessionCreated?: (sessionId: string) => void | Promise<void>;
}

export const useChat = ({
  initialSessionId,
  onSessionCreated,
}: UseChatProps) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const { messages, setMessages, setMessage } = useXChat<ChatMessage>({});
  const requestRef = useRef<AbstractXRequestClass<ChatRequest, SSEOutput> | null>(null);
  const loadSessionRequestIdRef = useRef(0);

  const [sendingLoading, setSendingLoading] = useState<boolean>(false);
  const [sessionMessagesLoading, setSessionMessagesLoading] = useState<boolean>(false);

  useEffect(() => {
    setSessionId(initialSessionId);
  }, [initialSessionId]);

  const handleCancel = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.status === "loading" || msg.status === "updating") {
          return {
            ...msg,
            status: "abort",
            message: {
              ...msg.message,
              isLoading: false,
              streamCompleted: true,
            },
          };
        }
        return msg;
      })
    );
    setSendingLoading(false);
  }, [setMessages]);

  const cancelSessionMessagesLoading = useCallback(() => {
    loadSessionRequestIdRef.current += 1;
    setSessionMessagesLoading(false);
  }, []);

  const loadMessagesBySession = useCallback(
    async (targetSessionId: string) => {
      const currentRequestId = loadSessionRequestIdRef.current + 1;
      loadSessionRequestIdRef.current = currentRequestId;
      setSessionMessagesLoading(true);
      setSessionId(targetSessionId);
      setMessages([]);

      try {
        const sessionMessages = await getSessionMessages(targetSessionId);
        if (loadSessionRequestIdRef.current !== currentRequestId) {
          return;
        }

        const processedMessages = processSessionMessages(sessionMessages);
        const messageInfos = processedMessages.map(
          (msg: SessionMessage, index: number) => ({
            id: `${targetSessionId}-${index}`,
            status: "success" as const,
            message: convertSessionMessageToChatMessage(msg),
          })
        );
        setMessages(messageInfos);
      } catch (error) {
        if (loadSessionRequestIdRef.current !== currentRequestId) {
          return;
        }
        console.error("加载会话消息失败:", error);
        setMessages([]);
      } finally {
        if (loadSessionRequestIdRef.current === currentRequestId) {
          setSessionMessagesLoading(false);
        }
      }
    },
    [setMessages]
  );

  const handleSubmit = useCallback(
    async (
      message: string,
      modelToUse: ModelListItem | DefaultModel | null,
      uploadId?: string,
      contentType?: string,
      fileUrl?: string
    ) => {
      setSendingLoading(true);

      let currentSessionId = sessionId;

      // Create session if needed
      if (!currentSessionId) {
        try {
          currentSessionId = await createSession();
          setSessionId(currentSessionId);
          if (onSessionCreated) {
            try {
              await onSessionCreated(currentSessionId);
            } catch (error) {
              console.warn("会话创建后的回调执行失败:", error);
            }
          }
        } catch (error) {
          setSendingLoading(false);
          return;
        }
      }

      const userMsgId = Date.now().toString();
      const aiMsgId = (Date.now() + 1).toString();

      const userMessage: MessageInfo<ChatMessage> = {
        id: userMsgId,
        message: {
          content: message,
          role: "user",
          avatar: "👤",
          fileUrl: fileUrl,
          contentType: contentType as any,
        },
        status: "success",
      };

      const aiMessage: MessageInfo<ChatMessage> = {
        id: aiMsgId,
        message: {
          content: "",
          role: "assistant",
          avatar: "🤖",
          isLoading: true,
          streamCompleted: false,
        },
        status: "loading",
      };

      // Use functional update to ensure we are appending to the latest state
      setMessages((prevMessages) => [...prevMessages, userMessage, aiMessage]);

      try {
        const requestData: ChatRequest = {
          sessionId: currentSessionId,
          prompt: message,
          ...(modelToUse?.providerId && { providerId: modelToUse.providerId }),
          ...(modelToUse?.modelName && { modelName: modelToUse.modelName }),
          ...(uploadId && { uploadId }),
          ...(contentType && { contentType }),
        };

        let fullContent = "";
        requestRef.current = createChatStreamRequest(requestData, {
          onUpdate: (chunk) => {
            const delta = parseChatStreamChunk(chunk);
            if (!delta) {
              return;
            }

            fullContent += delta;
            setMessage(aiMsgId, (msg) => ({
              ...msg,
              status: "updating",
              message: {
                ...msg.message,
                content: fullContent,
                isLoading: false,
                streamCompleted: false,
              },
            }));
          },
          onSuccess: (chunks) => {
            if (!fullContent && chunks.length > 0) {
              fullContent = chunks.map(parseChatStreamChunk).join("");
            }

            setMessage(aiMsgId, (msg) => ({
              ...msg,
              status: "success",
              message: {
                ...msg.message,
                isLoading: false,
                streamCompleted: true,
                content: fullContent,
              },
            }));
            requestRef.current = null;
            setSendingLoading(false);
          },
          onError: (error) => {
            const status = error.name === "AbortError" ? "abort" : "error";
            setMessage(aiMsgId, (msg) => ({
              ...msg,
              status,
              message: {
                ...msg.message,
                isLoading: false,
                streamCompleted: true,
                content: fullContent,
              },
            }));
            requestRef.current = null;
            setSendingLoading(false);
          },
        });
      } catch {
        setMessage(aiMsgId, (msg) => ({
          ...msg,
          status: "error",
          message: {
            ...msg.message,
            isLoading: false,
            streamCompleted: true,
          },
        }));
        requestRef.current = null;
        setSendingLoading(false);
      }
    },
    [onSessionCreated, sessionId, setMessage, setMessages]
  );

  return {
    messages,
    setMessages,
    sessionId,
    setSessionId,
    sessionMessagesLoading,
    loadMessagesBySession,
    cancelSessionMessagesLoading,
    sendingLoading,
    handleSubmit,
    handleCancel,
  };
};
