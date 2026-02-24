import { useState, useCallback, useEffect } from "react";
import { message as antdMessage } from "antd";
import { useXChat, MessageInfo } from "@ant-design/x-sdk";
import { ChatMessage } from "@/components/chat/ChatMessageList";
import {
  chatStream,
  ChatRequest,
  createSession,
} from "@/lib/api/conversations";
import { ModelListItem, DefaultModel } from "@/lib/api/models";

interface UseChatProps {
  initialSessionId: string | null;
  onSessionCreated?: (sessionId: string) => void;
}

export const useChat = ({
  initialSessionId,
  onSessionCreated,
}: UseChatProps) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const { messages, setMessages } = useXChat<ChatMessage>({});

  const [sendingLoading, setSendingLoading] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(
    null
  );

  useEffect(() => {
    setSessionId(initialSessionId);
  }, [initialSessionId]);

  const handleCancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setSendingLoading(false);
  }, [abortController]);

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
            onSessionCreated(currentSessionId);
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "未知错误";
          antdMessage.error("创建会话失败: " + errorMessage);
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

        const controller = new AbortController();
        setAbortController(controller);

        const reader = await chatStream(requestData, controller.signal);

        let fullContent = "";
        let buffer = "";

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let chunkContentDelta = "";
          let hasUpdates = false;

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const jsonData = JSON.parse(data);
              if (jsonData.content) {
                chunkContentDelta += jsonData.content;
                hasUpdates = true;
              }
            } catch {
              chunkContentDelta += data;
              hasUpdates = true;
            }
          }

          if (hasUpdates) {
            fullContent += chunkContentDelta;

            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                if (msg.id === aiMsgId) {
                  return {
                    ...msg,
                    status: "loading",
                    message: {
                      ...msg.message,
                      content: fullContent,
                      isLoading: false,
                    },
                  };
                }
                return msg;
              });
            });
          }
        }

        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg.id === aiMsgId) {
              return {
                ...msg,
                status: "success",
                message: {
                  ...msg.message,
                  isLoading: false,
                  content: fullContent,
                },
              };
            }
            return msg;
          });
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          // Handle cancellation: keep current content, remove loading
          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.id === aiMsgId) {
                return {
                  ...msg,
                  status: "success",
                  message: {
                    ...msg.message,
                    isLoading: false,
                  },
                };
              }
              return msg;
            });
          });
        } else {
          console.error("消息发送失败:", error);
          const errorMessage =
            error instanceof Error ? error.message : "未知错误";
          antdMessage.error("消息发送失败: " + errorMessage);

          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.id === aiMsgId) {
                return {
                  ...msg,
                  status: "error",
                  message: {
                    ...msg.message,
                    isLoading: false,
                    content: "抱歉，消息发送失败，请稍后重试。",
                  },
                };
              }
              return msg;
            });
          });
        }
      } finally {
        setSendingLoading(false);
        setAbortController(null);
      }
    },
    [sessionId, onSessionCreated, setMessages]
  );

  return {
    messages,
    setMessages,
    sessionId,
    setSessionId,
    sendingLoading,
    handleSubmit,
    handleCancel,
  };
};
