import { Button, theme, Modal, Input, message as antdMessage } from "antd";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import classNames from "classnames";
import styles from "./ChatSidebar.module.css";

import {
  LayoutOutlined,
  PlusOutlined,
  PlusCircleFilled,
  SettingOutlined,
  SettingFilled,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { Conversations, ConversationsProps } from "@ant-design/x";
import { type ConversationViewModel } from "@/lib/chat/useConversationStore";
import { useUser } from "@/contexts/UserContext";

// 时间分组函数
const getTimeGroup = (timestamp: number): string => {
  const now = new Date();

  // 获取今天0点的时间戳
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  // 获取昨天0点的时间戳
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  // 获取三天前0点的时间戳
  const threeDaysAgoStart = todayStart - 3 * 24 * 60 * 60 * 1000;
  // 获取一周前0点的时间戳
  const oneWeekAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  // 获取一个月前0点的时间戳
  const oneMonthAgoStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  if (timestamp >= todayStart) {
    return "今天";
  } else if (timestamp >= yesterdayStart) {
    return "昨天";
  } else if (timestamp >= threeDaysAgoStart) {
    return "三天前";
  } else if (timestamp >= oneWeekAgoStart) {
    return "一周前";
  } else if (timestamp >= oneMonthAgoStart) {
    return "一个月前";
  } else {
    return "更早";
  }
};

// 定义会话项类型
export interface ConversationItem {
  key: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  group?: string;
}

export interface ChatSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  sessions: ConversationViewModel[];
  selectedId: string;
  onAddConversation: () => void;
  onSettingsClick: () => void;
  onConversationSelect: (key: string) => void;
  onRenameConversation: (key: string, title: string) => Promise<void>;
  onDeleteConversation: (keys: string[]) => Promise<void>;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  collapsed,
  onCollapsedChange,
  sessions,
  selectedId,
  onAddConversation,
  onSettingsClick,
  onConversationSelect,
  onRenameConversation,
  onDeleteConversation,
}) => {
  const { token } = theme.useToken();
  const { userInfo } = useUser();
  
  // 编辑状态管理
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<any>(null);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (editingKey && editingValue.trim()) {
      await onRenameConversation(editingKey, editingValue.trim());
    }
    setEditingKey(null);
    setEditingValue("");
  }, [editingKey, editingValue, onRenameConversation]);

  // 开始编辑
  const handleStartEdit = useCallback((key: string, currentLabel: string) => {
    setEditingKey(key);
    setEditingValue(currentLabel);
  }, []);

  // 自动聚焦输入框
  useEffect(() => {
    if (editingKey && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [editingKey]);

  // 编程功能点击处理
  const handleProgrammingClick = useCallback(() => {
    antdMessage.info("正在开发中");
  }, []);

  // 构建 Conversations 的 items，包含固定功能项
  const conversationsItems = useMemo(() => {
    const sessionItems = sessions.map((session) => {
      const sessionKey = session.key;
      const isEditing = editingKey === sessionKey;
      return {
        key: sessionKey,
        label: isEditing ? (
          <Input
            ref={inputRef}
            size="small"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onPressEnter={handleSaveEdit}
            onBlur={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{ 
              padding: '2px 6px',
              fontSize: '14px',
              background: 'transparent',
              border: `1px solid ${token.colorPrimary}`,
              borderRadius: '4px',
            }}
          />
        ) : (session.sessionTitle || "未命名会话"),
        group: getTimeGroup(session.updatedAt || 0),
      };
    });

    // 固定功能项放在最前面
    return [
      {
        key: 'session-management',
        label: '会话管理',
        icon: <SettingOutlined />,
      },
      {
        key: 'programming',
        label: '编程',
        icon: <CodeOutlined />,
      },
      ...sessionItems,
    ];
  }, [sessions, editingKey, editingValue, token.colorPrimary, handleSaveEdit]);

  // 删除会话
  const handleDeleteConversation = useCallback((key: string) => {
    Modal.confirm({
      title: "永久删除会话",
      content: "确定要删除该会话吗？删除后无法恢复。",
      okText: "确定删除",
      cancelText: "取消",
      okType: "danger",
      centered: true,
      maskClosable: true,
      width: 400,
      onOk: async () => {
        try {
          await onDeleteConversation([key]);
          antdMessage.success("会话已删除");
        } catch (error) {
          console.error("删除会话失败:", error);
          antdMessage.error(
            "删除会话失败: " +
              (error instanceof Error ? error.message : "未知错误")
          );
        }
      },
    });
  }, [onDeleteConversation]);

  // 为Conversations组件创建菜单项
  const conversationMenu: ConversationsProps["menu"] = useCallback((item: any) => {
    // 固定功能项不显示右键菜单
    if (item.key === 'session-management' || item.key === 'programming') {
      return undefined;
    }
    
    return {
      items: [
        {
          label: "修改名称",
          key: "edit",
          icon: <EditOutlined />,
        },
        {
          label: "删除会话",
          key: "delete",
          icon: <DeleteOutlined />,
          danger: true,
        },
      ],
      onClick: (menuInfo: any) => {
        menuInfo.domEvent.stopPropagation();
        if (menuInfo.key === "edit") {
          handleStartEdit(item.key, String(item.label || ""));
        } else if (menuInfo.key === "delete") {
          handleDeleteConversation(item.key);
        }
      },
    };
  }, [handleStartEdit, handleDeleteConversation]);

  // 分组排序和标题自定义
  const groupable: ConversationsProps["groupable"] = {
    label: (group: string) =>
      group ? (
        <span>{group}</span>
      ) : null,
  };

  interface ToolbarButtonProps {
    iconOutline: React.ReactNode;
    iconFilled: React.ReactNode;
    onClick: () => void;
    isActive: boolean;
  }

  const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    iconOutline,
    iconFilled,
    onClick,
    isActive,
  }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const buttonStyle: React.CSSProperties = isActive
      ? {
          background: isHovered ? "#f5f5f7" : "#fff",
          color: token.colorPrimary,
          fontWeight: 700,
          boxShadow:
            "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
          width: "32px",
          height: "32px",
          padding: 0,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }
      : {
          background: isHovered ? token.colorPrimaryBg : "transparent",
          color: token.colorPrimary,
          opacity: isHovered ? 1 : 0.7,
          fontWeight: 600,
          width: "32px",
          height: "32px",
          padding: 0,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        };

    return (
      <Button
        type="text"
        icon={<span style={{ transition: "transform 0.3s ease" }}>{isActive ? iconFilled : iconOutline}</span>}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={buttonStyle}
        shape="round"
      />
    );
  };

  return (
    <div
      className={classNames(styles.sidebar, {
        [styles.sidebarCollapsed]: collapsed,
      })}
    >
      {/* 展开状态 */}
      {!collapsed && (
        <>
          {/* 顶部用户信息栏 */}
          <div className={styles.userBar}>
            <div className={styles.userInfo}>
              {userInfo?.profileAvatarUrl ? (
                <img src={userInfo.profileAvatarUrl} alt="avatar" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder} />
              )}
              <span className={styles.userName}>{userInfo?.nickName}</span>
            </div>
            <Button
              type="text"
              icon={<LayoutOutlined />}
              onClick={() => onCollapsedChange(!collapsed)}
              className={styles.collapseBtn}
            />
          </div>

          {/* 中间滚动区 */}
          <div
            className={classNames(styles.scrollArea, {
              [styles.scrollAreaCollapsed]: collapsed,
            })}
          >
            <Conversations
              items={conversationsItems}
              activeKey={selectedId}
              onActiveChange={(key) => {
                if (key === 'session-management') {
                  onSettingsClick();
                } else if (key === 'programming') {
                  handleProgrammingClick();
                } else {
                  onConversationSelect(key);
                }
              }}
              menu={conversationMenu}
              groupable={groupable}
              creation={{
                label: <span>新建对话</span>,
                icon: <PlusOutlined />,
                onClick: onAddConversation,
              }}
            />
          </div>

          {/* 底部 Chat Studio 标题 */}
          <div className={styles.brandTitle}>
            Chat Studio
          </div>
        </>
      )}

      {/* 折叠状态 */}
      {collapsed && (
        <div className={styles.collapsedContent}>
          {/* 展开按钮 */}
          <div
            className={styles.expandButton}
            onClick={() => onCollapsedChange(false)}
            title="展开侧边栏"
          >
            <LayoutOutlined />
          </div>

          {/* 功能按钮区 */}
          <div className={styles.collapsedButtons}>
            <div
              className={styles.collapsedButton}
              onClick={onAddConversation}
              title="新建对话"
            >
              <PlusOutlined />
            </div>
            <div
              className={styles.collapsedButton}
              onClick={onSettingsClick}
              title="会话管理"
            >
              <SettingOutlined />
            </div>
            <div
              className={styles.collapsedButton}
              onClick={handleProgrammingClick}
              title="编程"
            >
              <CodeOutlined />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
