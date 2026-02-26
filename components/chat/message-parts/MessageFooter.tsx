import React from 'react';

import { CheckCircleOutlined } from '@ant-design/icons';
import { Actions } from '@ant-design/x';

import type { ChatMessage } from "../ChatMessageList";
interface MessageFooterProps {
  message: ChatMessage;
  showActions?: boolean;
}

const MessageFooter: React.FC<MessageFooterProps> = ({
  message,
  showActions = false,
}) => {
  const assistantActionItems =
    message.role === "assistant"
      ? [
          {
            key: "done",
            actionRender: () => (
              <div>
                <CheckCircleOutlined style={{ color: "#999" }} />
                <span style={{ marginLeft: 4, color: "#999" }}>已完成</span>
              </div>
            ),
          },
          {
            key: "feedback",
            actionRender: () => (
              <Actions.Feedback
                styles={{
                  root: {
                    color: "#999",
                  },
                }}
              />
            ),
          },
        ]
      : [];

  return (
    <div>
      {showActions && (
        <Actions
          fadeInLeft
          items={[
            ...assistantActionItems,
            {
              key: "copy",
              label: "copy",
              actionRender: () => (
                <Actions.Copy
                  text={message.content}
                  styles={{ root: { color: "#999" } }}
                />
              ),
            },
            {
              key: "dateTime",
              actionRender: () => (
                <span
                  className="message-date-time"
                  style={{ fontSize: 13, color: "#999" }}
                >
                  {message.dateTime}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default React.memo(MessageFooter);
