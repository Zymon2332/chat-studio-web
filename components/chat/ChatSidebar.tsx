import { Button, theme, Modal, Input, message as antdMessage } from "antd";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import classNames from "classnames";
import styles from "./ChatSidebar.module.css";

import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  PlusCircleFilled,
  SettingOutlined,
  SettingFilled,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Conversations, ConversationsProps } from "@ant-design/x";
import { SessionItem, deleteSession, updateSessionTitle } from "@/lib/api/conversations";

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
  sessions: SessionItem[];
  selectedId: string;
  onAddConversation: () => void;
  onSettingsClick: () => void;
  onConversationSelect: (key: string) => void;
  onSessionsChange?: () => void;
  onSelectedSessionDeleted?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  collapsed,
  onCollapsedChange,
  sessions,
  selectedId,
  onAddConversation,
  onSettingsClick,
  onConversationSelect,
  onSessionsChange,
  onSelectedSessionDeleted,
}) => {
  const { token } = theme.useToken();
  
  // 编辑状态管理
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<any>(null);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (editingKey && editingValue.trim()) {
      try {
        await updateSessionTitle(editingKey, editingValue.trim());
        antdMessage.success("会话名称已更新");
        onSessionsChange?.();
      } catch (error) {
        console.error("更新会话名称失败:", error);
        antdMessage.error(
          "更新会话名称失败: " +
            (error instanceof Error ? error.message : "未知错误")
        );
      }
    }
    setEditingKey(null);
    setEditingValue("");
  }, [editingKey, editingValue, onSessionsChange]);

  // 开始编辑
  const handleStartEdit = useCallback((key: string, currentLabel: string) => {
    setEditingKey(key);
    setEditingValue(currentLabel);
  }, []);

  // 转换会话数据，支持内联编辑
  const items = useMemo(() => {
    return sessions.map((session) => {
      const isEditing = editingKey === session.sessionId;
      return {
        key: session.sessionId,
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
        ) : session.sessionTitle,
        group: getTimeGroup(session.updatedAt),
      };
    });
  }, [sessions, editingKey, editingValue, token.colorPrimary, handleSaveEdit]);

  // 自动聚焦输入框
  useEffect(() => {
    if (editingKey && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [editingKey]);

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
          await deleteSession(key);
          onSessionsChange?.();
          
          if (selectedId === key) {
            onSelectedSessionDeleted?.();
          }

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
  }, [selectedId, onSessionsChange, onSelectedSessionDeleted]);

  // 为Conversations组件创建菜单项
  const conversationMenu: ConversationsProps["menu"] = useCallback((item: any) => ({
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
  }), [handleStartEdit, handleDeleteConversation]);

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
      {/* 顶部操作区 (仅在折叠时显示新建按钮) */}
      {collapsed && (
        <div className={styles.topActions}>
          <ToolbarButton
            iconOutline={<PlusOutlined />}
            iconFilled={<PlusCircleFilled />}
            onClick={onAddConversation}
            isActive={false}
          />
        </div>
      )}

      {/* 中间滚动区 */}
      <div
        className={classNames(styles.scrollArea, {
          [styles.scrollAreaCollapsed]: collapsed,
        })}
      >
        {(() => {
          if (collapsed || items.length === 0) {
            return null;
          }

          return (
            <Conversations
              items={items}
              activeKey={selectedId}
              onActiveChange={onConversationSelect}
              menu={conversationMenu}
              groupable={groupable}
              creation={{
                label: <span>新建对话</span>,
                icon: <PlusOutlined />,
                onClick: onAddConversation,
              }}
            />
          );
        })()}
      </div>

      {/* 底部工具栏 */}
      <div
        className={classNames(styles.bottomToolbar, {
          [styles.bottomToolbarCollapsed]: collapsed,
        })}
      >
        <ToolbarButton
          iconOutline={<SettingOutlined />}
          iconFilled={<SettingFilled />}
          onClick={onSettingsClick}
          isActive={false}
        />

        <ToolbarButton
          iconOutline={
            collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
          }
          iconFilled={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => onCollapsedChange(!collapsed)}
          isActive={false}
        />
      </div>
    </div>
  );
};

export default ChatSidebar;
