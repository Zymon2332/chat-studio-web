"use client";

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Input,
  Space,
  message,
  Popconfirm,
  Typography,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { SessionItem, getSessionList, deleteSession, updateSessionTitle } from '@/lib/api/conversations';
import type { ColumnsType } from 'antd/es/table';
import styles from './SessionManageModal.module.css';

const { Search } = Input;
const { Text } = Typography;
export interface SessionManageModalProps {
  open: boolean;
  onCancel: () => void;
  onSessionsChange?: () => void; // 会话变更后的回调
  selectedSessionId?: string; // 当前选中的会话ID
  onSelectedSessionDeleted?: () => void; // 当前选中会话被删除时的回调
}

interface ExtendedSessionItem extends SessionItem {
  lastUpdateTime?: string; // 格式化后的时间
}

const SessionManageModal: React.FC<SessionManageModalProps> = ({ 
  open, 
  onCancel, 
  onSessionsChange,
  selectedSessionId,
  onSelectedSessionDeleted
}) => {
  const [sessions, setSessions] = useState<ExtendedSessionItem[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ExtendedSessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState('');

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 加载会话列表
  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionList = await getSessionList();
      const extendedSessions = sessionList.map(session => ({
        ...session,
        lastUpdateTime: formatTime(session.updatedAt),
      }));
      setSessions(extendedSessions);
      setFilteredSessions(extendedSessions);
    } catch (error) {
      console.error('加载会话列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索过滤
  const handleSearch = (value: string) => {
    if (!value.trim()) {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session =>
        session.sessionTitle.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSessions(filtered);
    }
  };

  // 开始编辑
  const startEdit = (record: ExtendedSessionItem) => {
    setEditingKey(record.sessionId);
    setEditingTitle(record.sessionTitle);
  };

  // 保存编辑
  const saveEdit = async (sessionId: string) => {
      // 调用更新会话名称的API
      await updateSessionTitle(sessionId, editingTitle);
      
      // 更新本地状态
      const updatedSessions = sessions.map(session =>
        session.sessionId === sessionId
          ? { ...session, sessionTitle: editingTitle }
          : session
      );
      setSessions(updatedSessions);
      
      // 同时更新过滤后的列表
      const updatedFilteredSessions = filteredSessions.map(session =>
        session.sessionId === sessionId
          ? { ...session, sessionTitle: editingTitle }
          : session
      );
      setFilteredSessions(updatedFilteredSessions);
      
      setEditingKey('');
      setEditingTitle('');
      
      // 通知父组件会话已变更
      onSessionsChange?.();
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingKey('');
    setEditingTitle('');
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的会话');
      return;
    }

    try {
      // 检查是否包含当前选中的会话
      const isCurrentSessionDeleted = selectedSessionId && selectedRowKeys.includes(selectedSessionId);
      
      // 批量删除会话
      await deleteSession(selectedRowKeys as string[]);
      
      message.success(`成功删除 ${selectedRowKeys.length} 个会话`);
      
      // 重新加载会话列表
      await loadSessions();
      setSelectedRowKeys([]);
      
      // 通知父组件会话已变更
      onSessionsChange?.();
      
      // 如果删除的会话中包含当前选中的会话，通知父组件清空右侧聊天区域
      if (isCurrentSessionDeleted) {
        onSelectedSessionDeleted?.();
      }
    } catch (error) {
      console.error('批量删除会话失败:', error);
      message.error('批量删除会话失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<ExtendedSessionItem> = [
    {
      title: '会话名称',
      dataIndex: 'sessionTitle',
      key: 'sessionTitle',
      render: (text: string, record: ExtendedSessionItem) => {
        const isEditing = editingKey === record.sessionId;
        
        if (isEditing) {
          return (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onPressEnter={() => saveEdit(record.sessionId)}
              className={styles.editingInput}
              autoFocus
            />
          );
        }
        
        return (
          <Text
            ellipsis={{ tooltip: text }}
            className={styles.sessionTitle}
          >
            {text}
          </Text>
        );
      },
    },
    {
      title: '最后更新时间',
      dataIndex: 'lastUpdateTime',
      key: 'lastUpdateTime',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: ExtendedSessionItem) => {
        const isEditing = editingKey === record.sessionId;
        
        if (isEditing) {
          return (
            <Space>
              <Tooltip title="保存">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => saveEdit(record.sessionId)}
                />
              </Tooltip>
              <Tooltip title="取消">
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={cancelEdit}
                />
              </Tooltip>
            </Space>
          );
        }
        
        return (
          <Tooltip title="编辑会话名称">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => startEdit(record)}
            />
          </Tooltip>
        );
      },
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: ExtendedSessionItem) => ({
      disabled: editingKey === record.sessionId, // 编辑状态下禁用选择
    }),
  };

  // 模态框打开时加载数据
  useEffect(() => {
    if (open) {
      loadSessions();
      // 重置状态
      setSelectedRowKeys([]);
      setEditingKey('');
      setEditingTitle('');
    }
  }, [open]);

  return (
    <Modal
      title="会话管理"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Popconfirm
          key="batchDelete"
          title="确定要删除选中的会话吗？"
          description={`将删除 ${selectedRowKeys.length} 个会话，此操作不可恢复。`}
          onConfirm={handleBatchDelete}
          disabled={selectedRowKeys.length === 0}
          okText="确定删除"
          cancelText="取消"
        >
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            disabled={selectedRowKeys.length === 0}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
        </Popconfirm>,
        <Button key="cancel" onClick={onCancel}>
          关闭
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className={styles.searchContainer}>
        <Search
          placeholder="搜索会话名称"
          allowClear
          className={styles.searchInput}
          onSearch={handleSearch}
          onChange={(e) => {
            if (!e.target.value) {
              handleSearch('');
            }
          }}
        />
      </div>
      
      <Table
        columns={columns}
        dataSource={filteredSessions}
        rowKey="sessionId"
        rowSelection={rowSelection}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        scroll={{ y: 400 }}
      />
    </Modal>
  );
};

export default SessionManageModal;