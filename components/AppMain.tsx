"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import HeaderComponent from "./Header";
import UserModal from "./UserModal";
import SettingsModal from "./SettingsModal";
import { logout } from "../lib/api";
import { useUser } from "@/contexts/UserContext";
import styles from "./AppMain.module.css";

interface AppMainProps {
  children: React.ReactNode;
}

const AppMain: React.FC<AppMainProps> = ({ children }) => {
  const pathname = usePathname();
  const { userInfo, clearUserInfo } = useUser();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // 根据当前路径确定选中的 tab
  const getSelectedTab = () => {
    if (pathname.startsWith('/chat')) return 'chat';
    if (pathname.startsWith('/knowledgebase') || pathname.startsWith('/documents')) return 'kb';
    if (pathname.startsWith('/mcp')) return 'mcp';
    return 'chat'; // 默认选中 chat
  };

  const handleUserClick = () => setUserModalOpen(true);
  const handleSettingsClick = () => setSettingsModalOpen(true);
  const handleUserModalClose = () => setUserModalOpen(false);
  const handleSettingsModalClose = () => setSettingsModalOpen(false);
  const handleLogin = () => {
    // 登录成功后，UserContext 会自动更新
  };
  
  const handleLogout = async () => {
    try {
      // 调用登出接口
      await logout();
    } catch (error) {
      console.error('登出接口调用失败:', error);
    } finally {
      // 清除本地认证信息
      clearUserInfo();
      // 登出后重定向到 chat 页面，清理所有界面数据
      window.location.href = '/chat';
    }
  };

  return (
    <div className={styles.container}>
      <HeaderComponent 
        selectedTab={getSelectedTab()} 
        onUserClick={handleUserClick}
        onSettingsClick={handleSettingsClick}
        isLogin={userInfo !== null}
        onLogout={handleLogout}
        userInfo={userInfo}
      />
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
      <UserModal
        open={userModalOpen}
        onCancel={handleUserModalClose}
        onLogin={handleLogin}
      />
      <SettingsModal
        open={settingsModalOpen}
        onClose={handleSettingsModalClose}
        userInfo={userInfo}
      />
    </div>
  );
};

export default AppMain;