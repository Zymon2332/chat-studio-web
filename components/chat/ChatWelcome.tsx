import React from "react";
import {
  FileTextOutlined,
  MessageOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SettingOutlined,
  RightOutlined,
} from "@ant-design/icons";

import styles from "./ChatWelcome.module.css";

interface PromptSuggestion {
  icon: React.ReactNode;
  title: string;
  prompt: string;
  color: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  model?: string;
}

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions: { label: string; onClick: () => void }[];
  color: string;
}

interface ChatWelcomeProps {
  onSuggestionClick?: (suggestion: string) => void;
  userName?: string;
  recentConversations?: Conversation[];
}

const promptSuggestions: PromptSuggestion[] = [
  {
    icon: <FileTextOutlined />,
    title: "文档总结",
    prompt: "帮我总结这份文档的核心要点和关键结论",
    color: "#E6F4FF",
  },
  {
    icon: <DatabaseOutlined />,
    title: "概念解释",
    prompt: "用简单易懂的话解释这个概念",
    color: "#FFF7E6",
  },
  {
    icon: <MessageOutlined />,
    title: "代码生成",
    prompt: "帮我写一个函数来实现这个功能",
    color: "#F6FFED",
  },
  {
    icon: <DatabaseOutlined />,
    title: "数据分析",
    prompt: "分析这组数据并给出有价值的见解",
    color: "#F9F0FF",
  },
];

const defaultConversations: Conversation[] = [
  {
    id: "1",
    title: "前端性能优化方案讨论",
    updatedAt: "2 小时前",
    model: "GPT-4",
  },
  {
    id: "2",
    title: "React 18 新特性学习笔记",
    updatedAt: "昨天",
    model: "Claude",
  },
  {
    id: "3",
    title: "API 接口设计规范",
    updatedAt: "3 天前",
    model: "GPT-4",
  },
];

const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  onSuggestionClick,
  userName = "用户",
  recentConversations = defaultConversations,
}) => {
  const featureCards: FeatureCard[] = [
    {
      icon: <DatabaseOutlined />,
      title: "知识库",
      description: "上传文档，创建专属问答助手",
      actions: [
        { label: "上传文档", onClick: () => onSuggestionClick?.("上传文档") },
        { label: "浏览知识库", onClick: () => onSuggestionClick?.("浏览知识库") },
      ],
      color: "#1890ff",
    },
    {
      icon: <ApiOutlined />,
      title: "MCP 服务器",
      description: "连接外部工具，扩展 AI 能力",
      actions: [
        { label: "管理服务器", onClick: () => onSuggestionClick?.("管理 MCP 服务器") },
        { label: "查看文档", onClick: () => onSuggestionClick?.("查看 MCP 文档") },
      ],
      color: "#722ed1",
    },
    {
      icon: <SettingOutlined />,
      title: "模型设置",
      description: "选择 AI 模型，配置 Thinking 模式",
      actions: [
        { label: "选择模型", onClick: () => onSuggestionClick?.("选择模型") },
        { label: "调整参数", onClick: () => onSuggestionClick?.("调整模型参数") },
      ],
      color: "#fa8c16",
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 顶部欢迎区 */}
        <div className={styles.header}>
          <h1 className={styles.welcomeTitle}>
            欢迎回来，{userName}<span className={styles.waveEmoji}>👋</span>
          </h1>
          <p className={styles.welcomeSubtitle}>今天我能为你做些什么？</p>
        </div>

        {/* 对话示例区 */}
        <div className={styles.suggestionsSection}>
          <h3 className={styles.sectionTitle}>快速开始</h3>
          <div className={styles.suggestionsGrid}>
            {promptSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className={styles.suggestionCard}
                onClick={() => onSuggestionClick?.(suggestion.prompt)}
              >
                <div
                  className={styles.suggestionIcon}
                  style={{ background: suggestion.color }}
                >
                  {suggestion.icon}
                </div>
                <div className={styles.suggestionInfo}>
                  <div className={styles.suggestionTitle}>{suggestion.title}</div>
                  <div className={styles.suggestionPrompt}>{suggestion.prompt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部两栏 */}
        <div className={styles.bottomSection}>
          {/* 最近对话 */}
          <div className={`${styles.card} ${styles.conversationsCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <MessageOutlined className={styles.cardIcon} />
                <span className={styles.cardTitle}>最近对话</span>
              </div>
              <button
                className={styles.viewAllButton}
                onClick={() => onSuggestionClick?.("查看全部对话")}
              >
                查看全部 <RightOutlined style={{ fontSize: 12 }} />
              </button>
            </div>
            <div className={styles.conversationList}>
              {recentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={styles.conversationItem}
                  onClick={() => onSuggestionClick?.(`打开对话: ${conversation.id}`)}
                >
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationTitle}>{conversation.title}</div>
                    <div className={styles.conversationMeta}>
                      <span className={styles.conversationModel}>{conversation.model}</span>
                      <span className={styles.conversationTime}>{conversation.updatedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 功能入口 */}
          <div className={styles.featuresSection}>
            <h3 className={styles.sectionTitle}>功能入口</h3>
            <div className={styles.featuresGrid}>
              {featureCards.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <div
                    className={styles.featureIcon}
                    style={{ background: `${feature.color}15`, color: feature.color }}
                  >
                    {feature.icon}
                  </div>
                  <div className={styles.featureContent}>
                    <div className={styles.featureTitle}>{feature.title}</div>
                    <div className={styles.featureDesc}>{feature.description}</div>
                    <div className={styles.featureActions}>
                      {feature.actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          className={styles.featureActionBtn}
                          onClick={action.onClick}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWelcome;
