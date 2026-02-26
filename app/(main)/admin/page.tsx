'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  SettingOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { UserInfo } from '@/lib/api';
import DashboardPanel from '@/components/admin/DashboardPanel';
import UserManagementPanel from '@/components/admin/UserManagementPanel';
import SystemSettingsPanel from '@/components/admin/SystemSettingsPanel';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

type AdminTab = 'dashboard' | 'users' | 'system';

const AdminConsole: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // 检查用户权限
  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      const parsedUserInfo = JSON.parse(storedUserInfo);
      setUserInfo(parsedUserInfo);
      
      // 如果不是管理员，重定向到聊天页
      if (parsedUserInfo.userRole !== 'ADMIN') {
        router.push('/chat');
        return;
      }
    } else {
      // 未登录，重定向到聊天页
      router.push('/chat');
      return;
    }
  }, [router]);

  // 左侧菜单项
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  // 渲染内容
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPanel />;
      case 'users':
        return <UserManagementPanel />;
      case 'system':
        return <SystemSettingsPanel />;
      default:
        return <DashboardPanel />;
    }
  };

  if (!userInfo || userInfo.userRole !== 'ADMIN') {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="light"
        width={250}
      >
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center'
        }}>
          <Title level={4} style={{ margin: 0 }}>
            {collapsed ? '控制台' : '管理员控制台'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          items={menuItems}
          onClick={({ key }) => setActiveTab(key as AdminTab)}
          style={{ border: 'none' }}
        />
      </Sider>
      
      <Layout>
        <Content style={{ 
          margin: '24px',
          padding: '24px',
          background: '#fff',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 48px)',
          overflow: 'auto'
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminConsole;