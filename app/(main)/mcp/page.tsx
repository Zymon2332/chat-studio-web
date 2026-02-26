'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Space, message, Spin, theme, Input, Select } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ShareAltOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { UserInfo, MCPServerState, MCPServerListParams } from '@/lib/api';
import MCPServerList from '@/components/mcp/MCPServerList';
import AddMCPServerModal from '@/components/mcp/AddMcpServerModal';

const { Title, Text } = Typography;
const { Option } = Select;

export default function MCPPage() {
  const router = useRouter();
  const { token } = theme.useToken();
  
  const [isLogin, setIsLogin] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 筛选状态
  const [filterParams, setFilterParams] = useState<MCPServerListParams>({});
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userInfoStr = localStorage.getItem('userInfo');
    
    if (token && userInfoStr) {
      setIsLogin(true);
      setUserInfo(JSON.parse(userInfoStr));
    } else {
      setIsLogin(false);
      message.warning('请先登录后使用 MCP 功能');
      router.push('/chat');
    }
  }, [router]);

  const handleAddSuccess = () => {
    setAddModalVisible(false);
    setRefreshTrigger(prev => prev + 1);
    message.success('MCP 服务器添加成功');
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setFilterParams(prev => ({
      ...prev,
      serverName: value || undefined
    }));
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (isLogin === null) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: token.colorBgLayout
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isLogin) {
    return null;
  }

  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      background: token.colorBgLayout, 
      color: token.colorText, 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 32px', 
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        gap: 24
      }}>
        <div style={{ flexShrink: 0 }}>
          <Title level={4} style={{ margin: 0, marginBottom: 2 }}>MCP 服务器</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理 Model Context Protocol 服务器连接</Text>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
          <Input
            prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
            placeholder="搜索服务器..."
            allowClear
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 260, borderRadius: token.borderRadius }}
          />
          
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setFilterParams(prev => ({ ...prev, state: value }))}
          >
            <Option value={MCPServerState.HEALTH}>
              <Space><CheckCircleOutlined style={{ color: token.colorSuccess }} /> 健康</Space>
            </Option>
            <Option value={MCPServerState.FAIL}>
              <Space><ExclamationCircleOutlined style={{ color: token.colorError }} /> 异常</Space>
            </Option>
          </Select>

          <Select
            placeholder="共享"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setFilterParams(prev => ({ ...prev, shared: value }))}
          >
            <Option value={true}>
              <Space><ShareAltOutlined style={{ color: token.colorPrimary }} /> 共享</Space>
            </Option>
            <Option value={false}>
              <Space><LockOutlined style={{ color: token.colorTextSecondary }} /> 私有</Space>
            </Option>
          </Select>

          <Button 
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
          
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
          >
            添加服务器
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          background: token.colorBgContainer, 
          padding: 24, 
          borderRadius: token.borderRadiusLG,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: token.boxShadowTertiary
        }}>
          <MCPServerList 
            filterParams={filterParams}
            refreshTrigger={refreshTrigger}
            onAddServer={() => setAddModalVisible(true)}
          />
        </div>
      </div>

      <AddMCPServerModal
        visible={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
