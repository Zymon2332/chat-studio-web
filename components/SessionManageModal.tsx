"use client";

import React, { useMemo, useState, useEffect } from 'react';
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
import type { ColumnsType } from 'antd/es/table';
import { type ConversationViewModel } from '@/lib/chat/useConversationStore';
import styles from './SessionManageModal.module.css';

const { Search } = Input;
const { Text } = Typography;

export interface SessionManageModalProps {
  open: boolean;
  onCancel: () => void;
  conversations: ConversationViewModel[];
  selectedSessionId?: string;
  onRenameConversation: (conversationKey: string, title: string) => Promise<void>;
  onDeleteConversations: (conversationKeys: string[]) => Promise<void>;
}

const SessionManageModal: React.FC<SessionManageModalProps> = ({
  open,
  onCancel,
  conversations,
  selectedSessionId,
  onRenameConversation,
  onDeleteConversations,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (days < 7) {
      return `${days}天前`;
    }
    return date.toLocaleDateString('zh-CN');
  };

  const filteredConversations = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) {
      return conversations;
    }
    return conversations.filter((conversation) =>
      conversation.sessionTitle.toLowerCase().includes(keyword)
    );
  }, [conversations, searchValue]);

  const startEdit = (record: ConversationViewModel) => {
    setEditingKey(record.key);
    setEditingTitle(record.sessionTitle);
  };

  const saveEdit = async (conversationKey: string) => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      message.warning('会话名称不能为空');
      return;
    }

    await onRenameConversation(conversationKey, trimmedTitle);
    setEditingKey('');
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingKey('');
    setEditingTitle('');
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的会话');
      return;
    }

    const conversationKeys = selectedRowKeys as string[];

    await onDeleteConversations(conversationKeys);

    message.success(`成功删除 ${conversationKeys.length} 个会话`);
    setSelectedRowKeys([]);

    if (selectedSessionId && conversationKeys.includes(selectedSessionId)) {
      setEditingKey('');
      setEditingTitle('');
    }
  };

  const columns: ColumnsType<ConversationViewModel> = [
    {
      title: '会话名称',
      dataIndex: 'sessionTitle',
      key: 'sessionTitle',
      render: (text: string, record: ConversationViewModel) => {
        const isEditing = editingKey === record.key;

        if (isEditing) {
          return (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onPressEnter={() => saveEdit(record.key)}
              className={styles.editingInput}
              autoFocus
            />
          );
        }

        return (
          <Text ellipsis={{ tooltip: text }} className={styles.sessionTitle}>
            {text}
          </Text>
        );
      },
    },
    {
      title: '最后更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (updatedAt: number) => formatTime(updatedAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: ConversationViewModel) => {
        const isEditing = editingKey === record.key;

        if (isEditing) {
          return (
            <Space>
              <Tooltip title="保存">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => saveEdit(record.key)}
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

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: ConversationViewModel) => ({
      disabled: editingKey === record.key,
    }),
  };

  useEffect(() => {
    if (open) {
      setSelectedRowKeys([]);
      setEditingKey('');
      setEditingTitle('');
      setSearchValue('');
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
          value={searchValue}
          onSearch={setSearchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredConversations}
        rowKey="key"
        rowSelection={rowSelection}
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
