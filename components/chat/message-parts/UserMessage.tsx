import React from 'react';
import { Image, Typography } from 'antd';
import { FilePdfOutlined, VideoCameraOutlined, AudioOutlined } from '@ant-design/icons';
import type { ChatMessage } from '../ChatMessageList';
import styles from './UserMessage.module.css';

const { Text } = Typography;

interface UserMessageProps {
  message: ChatMessage;
}

const FileContent: React.FC<{ contentType: string; fileUrl?: string }> = ({ 
  contentType, 
  fileUrl 
}) => {
  if (!contentType || !fileUrl) return null;

  switch (contentType) {
    case 'IMAGE':
      return (
        <div className={styles.imageContainer}>
          <Image
            src={fileUrl}
            alt="Uploaded Image"
            className={styles.image}
          />
        </div>
      );
    case 'VIDEO':
      return (
        <div className={styles.filePlaceholder}>
          <VideoCameraOutlined className={styles.videoIcon} />
          <Text ellipsis className={styles.fileName}>视频文件</Text>
        </div>
      );
    case 'AUDIO':
      return (
        <div className={styles.filePlaceholder}>
          <AudioOutlined className={styles.audioIcon} />
          <Text ellipsis className={styles.fileName}>音频文件</Text>
        </div>
      );
    case 'PDF':
      return (
        <div className={styles.filePlaceholder}>
          <FilePdfOutlined className={styles.pdfIcon} />
          <Text ellipsis className={styles.fileName}>PDF 文档</Text>
        </div>
      );
    default:
      return null;
  }
};

const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  return (
    <div className={styles.userMessage}>
      <FileContent contentType={message.contentType || ''} fileUrl={message.fileUrl} />
      <div>{message.content}</div>
    </div>
  );
};

export default React.memo(UserMessage);
