import React from "react";
import {
  FileTextOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";

import styles from "./ChatWelcome.module.css";

interface RecentFile {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

interface TaskItem {
  title: string;
  status: "urgent" | "inprogress" | "pending";
  statusLabel: string;
  dueDate: string;
}

interface ChatWelcomeProps {
  onSuggestionClick?: (suggestion: string) => void;
  userName?: string;
}

const recentFiles: RecentFile[] = [
  {
    icon: <FileTextOutlined />,
    title: "产品设计稿",
    subtitle: "Figma · 2 小时前",
    color: "#FFE4D6",
  },
  {
    icon: <ThunderboltOutlined />,
    title: "用户流程图",
    subtitle: "Miro · 昨天",
    color: "#D6E4FF",
  },
  {
    icon: <FileTextOutlined />,
    title: "战略目标",
    subtitle: "PDF · 3 天前",
    color: "#FFE8E8",
  },
];

const tasks: TaskItem[] = [
  {
    title: "完成 V2.0 视觉评审",
    status: "urgent",
    statusLabel: "紧急",
    dueDate: "今天，18:00",
  },
  {
    title: "整理 9 月份用户反馈报告",
    status: "inprogress",
    statusLabel: "进行中",
    dueDate: "10 月 15 日",
  },
  {
    title: "更新 MCP 连接器文档",
    status: "pending",
    statusLabel: "待处理",
    dueDate: "10 月 20 日",
  },
];

const ChatWelcome: React.FC<ChatWelcomeProps> = ({ onSuggestionClick, userName = "用户" }) => {
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

        {/* 上部两个大卡片 */}
        <div className={styles.topSection}>
          {/* 左侧智能助手建议 */}
          <div className={`${styles.card} ${styles.suggestionCard}`}>
            <div className={styles.suggestionContent}>
              <div className={styles.suggestionTag}>智能助手建议</div>
              <h2 className={styles.suggestionMainTitle}>
                基于你昨天的会议，我为你准备了 3 个自动化工作流建议。
              </h2>
              <p className={styles.suggestionDesc}>
                自动整理 UX 调研笔记，生成 Figma 任务卡片，并同步至团队看板。
              </p>
              <div className={styles.suggestionButtons}>
                <button 
                  className={styles.primaryButton}
                  onClick={() => onSuggestionClick?.("启动自动化工作流")}
                >
                  立即开启
                </button>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => onSuggestionClick?.("稍后再说")}
                >
                  稍后再说
                </button>
              </div>
            </div>
            <div className={styles.suggestionIconBg}>
              <ThunderboltOutlined style={{ fontSize: 80, opacity: 0.1 }} />
            </div>
          </div>

          {/* 右侧会议摘要 */}
          <div className={`${styles.card} ${styles.meetingCard}`}>
            <div className={styles.videoThumbnail}>
              <div className={styles.playButton}>
                <PlayCircleOutlined style={{ fontSize: 48 }} />
              </div>
              <span className={styles.duration}>45:12</span>
            </div>
            <div className={styles.meetingInfo}>
              <div className={styles.meetingHeader}>
                <span className={styles.meetingType}>会议摘要</span>
                <span className={styles.meetingTime}>2 小时前</span>
              </div>
              <h3 className={styles.meetingTitle}>UX 战略周度会议</h3>
              <p className={styles.meetingDesc}>
                讨论了 Q4 产品的核心体验方向，包括 Bento Box 布局的落地以及暗色模式的适配标准...
              </p>
              <button 
                className={styles.viewMoreButton}
                onClick={() => onSuggestionClick?.("查看会议摘要")}
              >
                查看全文 AI 总结
              </button>
            </div>
          </div>
        </div>

        {/* 下部两个卡片 */}
        <div className={styles.bottomSection}>
          {/* 最近查看 */}
          <div className={`${styles.card} ${styles.recentCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <ClockCircleOutlined className={styles.cardIcon} />
                <span className={styles.cardTitle}>最近查看</span>
              </div>
              <button className={styles.viewAllButton}>查看全部</button>
            </div>
            <div className={styles.fileList}>
              {recentFiles.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <div className={styles.fileIcon} style={{ background: file.color }}>
                    {file.icon}
                  </div>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{file.title}</div>
                    <div className={styles.fileSubtitle}>{file.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 我的任务 */}
          <div className={`${styles.card} ${styles.taskCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <CheckCircleOutlined className={styles.cardIcon} />
                <span className={styles.cardTitle}>我的任务</span>
              </div>
              <div className={styles.taskFilter}>
                <button className={styles.filterActive}>全部</button>
                <button className={styles.filterInactive}>进行中</button>
              </div>
            </div>
            <div className={styles.taskList}>
              <div className={styles.taskTableHeader}>
                <span className={styles.taskHeaderCell}>任务名称</span>
                <span className={styles.taskHeaderCell}>状态</span>
                <span className={styles.taskHeaderCell}>截止日期</span>
                <span className={styles.taskHeaderCell}>负责人</span>
              </div>
              {tasks.map((task, index) => (
                <div key={index} className={styles.taskItem}>
                  <span className={styles.taskName}>{task.title}</span>
                  <span className={`${styles.taskStatus} ${styles[task.status]}`}>
                    {task.statusLabel}
                  </span>
                  <span className={styles.taskDueDate}>{task.dueDate}</span>
                  <div className={styles.taskAssignee}>
                    <div className={styles.assigneeAvatar} />
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
