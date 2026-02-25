"use client";
import React, { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const { userInfo, clearUserInfo } = useUser();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // 使用 useMemo 优化 selectedTab 计算
  const selectedTab = useMemo(() => {
    if (pathname.startsWith('/chat')) return 'chat';
    if (pathname.startsWith('/knowledgebase') || pathname.startsWith('/documents')) return 'kb';
    if (pathname.startsWith('/mcp')) return 'mcp';
    return 'chat';
  }, [pathname]);

  const handleUserClick = () => setUserModalOpen(true);
  const handleSettingsClick = () => setSettingsModalOpen(true);
  const handleUserModalClose = () => setUserModalOpen(false);
  const handleSettingsModalClose = () => setSettingsModalOpen(false);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('登出接口调用失败:', error);
    } finally {
      clearUserInfo();
      // 使用 router.replace 替代 window.location.href，避免整页刷新
      router.replace('/chat');
    }
  };

  return (
    <div className={styles.container}>
      <HeaderComponent 
        selectedTab={selectedTab}
        onUserClick={handleUserClick}
        onSettingsClick={handleSettingsClick}
        isLogin={userInfo !== null}
        onLogout={handleLogout}
        userInfo={userInfo}
      />
      <main className={styles.main}>
        {children}
      </main>
      <UserModal
        open={userModalOpen}
        onCancel={handleUserModalClose}
        onLogin={() => {}}
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
