import React from 'react';
import { Actions } from '@ant-design/x';
import type { ChatMessage } from '../ChatMessageList';
import styles from './MessageFooter.module.css';

interface MessageFooterProps {
  message: ChatMessage;
  showActions?: boolean;
}

const MessageFooter: React.FC<MessageFooterProps> = ({ message, showActions = false }) => {
  return (
    <div>
      {showActions && (
        <Actions
          items={[
            {
              key: "copy",
              label: "copy",
              actionRender: () => <Actions.Copy text={message.content} />,
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
                />
              ),
            },
          ]}
        />
      )}
      {message.dateTime && <span>{message.dateTime}</span>}
    </div>
  );
};

export default React.memo(MessageFooter);
