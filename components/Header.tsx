import React from 'react';
import { Layout, Avatar, Button, Dropdown, message, theme, Divider, Tag, Flex, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, CrownOutlined, AppstoreOutlined, RocketOutlined, UpOutlined, DownOutlined, MessageOutlined, MessageFilled, BookOutlined, BookFilled, ApiOutlined, ApiFilled, ThunderboltOutlined, ThunderboltFilled } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';
import styles from './Header.module.css';

const { Header } = Layout;

interface UserInfo {
  userId: string;
  userRole: string;
  state: string;
  capacity: number;
  inviteCode: string;
}

interface HeaderProps {
  selectedTab: string;
  onUserClick: () => void;
  onSettingsClick: () => void;
  isLogin: boolean;
  onLogout: () => void;
  userInfo: UserInfo | null;
}

const HeaderComponent: React.FC<HeaderProps> = ({ selectedTab, onUserClick, onSettingsClick, isLogin, onLogout, userInfo }) => {
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const { token } = theme.useToken();

  const workbenchTabs = [
    { key: 'kb', iconOutline: <BookOutlined />, iconFilled: <BookFilled />, label: '知识库' },
    { key: 'chat', iconOutline: <MessageOutlined />, iconFilled: <MessageFilled />, label: '聊天' },
    { key: 'mcp', iconOutline: <ApiOutlined />, iconFilled: <ApiFilled />, label: 'MCP' },
  ];

  const advancedTabs = [
    { key: 'workflow', iconOutline: <ThunderboltOutlined />, iconFilled: <ThunderboltFilled />, label: '工作流' },
  ];

  const handleNewFeatureClick = (featureName: string) => {
    message.info(`${featureName}功能正在开发中`);
  };

  const handleAdminClick = () => {
    router.push('/admin');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: onSettingsClick,
    },
    ...(userInfo?.userRole === 'ADMIN' ? [{
      key: 'admin',
      label: '管理员设置',
      icon: <CrownOutlined />,
      onClick: handleAdminClick,
    }] : []),
    {
      key: 'logout',
      label: '登出',
      icon: <LogoutOutlined />,
      onClick: onLogout,
    },
    {
      type: 'divider',
    },
    {
      key: 'online',
      label: (
        <div className={styles.onlineStatusItem}>
          <div className={styles.onlineStatusDot}></div>
          当前在线用户: 1
        </div>
      ),
      disabled: true,
    },
  ];

  interface TabButtonProps {
    tab: { key: string; iconOutline: React.ReactNode; iconFilled: React.ReactNode; label: string };
    isSelected: boolean;
  }

  const TabButton: React.FC<TabButtonProps> = ({ tab, isSelected }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const getButtonStyle = (): React.CSSProperties => {
      if (isSelected) {
        return {
          background: isHovered ? '#f5f5f7' : '#fff',
          color: token.colorPrimary,
          fontWeight: 700,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        };
      } else {
        return {
          background: isHovered ? token.colorPrimaryBg : 'transparent',
          color: isHovered ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.45)',
          fontWeight: 600,
        };
      }
    };

    return (
      <div className={styles.tabButtonWrapper}>
        <Button
          type="text"
          icon={<span className={styles.tabIcon}>{isSelected ? tab.iconFilled : tab.iconOutline}</span>}
          onClick={() => {
            if (tab.key === 'chat') router.push('/chat');
            else if (tab.key === 'kb') router.push('/knowledgebase');
            else if (tab.key === 'mcp') router.push('/mcp');
            else handleNewFeatureClick(tab.label);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={styles.tabButton}
          style={getButtonStyle()}
          shape="round"
        >
          {tab.label}
        </Button>
      </div>
    );
  };

  return (
    <Header
      className={classNames(styles.header, { [styles.headerCollapsed]: collapsed })}
    >
      <div className={classNames(styles.innerContainer, { [styles.innerContainerCollapsed]: collapsed })}>
        {/* 左侧占位 */}
        <div className={styles.leftPlaceholder}></div>

        {/* 中间 Tab */}
        <div className={styles.tabsWrapper}>
          <div className={styles.tabsContainer}>
            {/* 工作台分组 */}
            <Flex align="center" gap={4} className={styles.tabGroup}>
              {workbenchTabs.map(tab => (
                <TabButton key={tab.key} tab={tab} isSelected={selectedTab === tab.key} />
              ))}
            </Flex>

            <Divider orientation="vertical" />

            {/* 高级功能分组 */}
            <Flex align="center" gap={4}>
              {advancedTabs.map(tab => (
                <TabButton key={tab.key} tab={tab} isSelected={selectedTab === tab.key} />
              ))}
            </Flex>
          </div>
        </div>

        {/* 右上角用户按钮 */}
        <div className={styles.userContainer}>
          {isLogin ? (
            <Dropdown
              menu={{ items: menuItems, className: styles.dropdownMenu }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Avatar
                size={40}
                icon={<UserOutlined />}
              />
            </Dropdown>
          ) : (
            <Avatar
              size={40}
              icon={<UserOutlined />}
              onClick={onUserClick}
            />
          )}
        </div>
      </div>

      {/* 收起/展开按钮 */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        className={styles.collapseButton}
      >
        {collapsed ? <DownOutlined /> : <UpOutlined />}
      </div>
    </Header>
  );
};

export default HeaderComponent;
