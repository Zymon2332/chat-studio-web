"use client";
import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import HeaderComponent from "./Header";
import SettingsModal from "./SettingsModal";
import { logout } from "../lib/api";
import { useUser } from "@/contexts/UserContext";
import styles from "./AppMain.module.css";

interface AppMainProps {
  children: React.ReactNode;
}

const AppMain: React.FC<AppMainProps> = ({ children }) => {
  const pathname = usePathname();
  const { userInfo, isLogin, clearUserInfo } = useUser();
  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);

  // 使用 useMemo 优化 selectedTab 计算
  const selectedTab = useMemo(() => {
    if (pathname.startsWith('/chat')) return 'chat';
    if (pathname.startsWith('/knowledgebase') || pathname.startsWith('/documents')) return 'kb';
    if (pathname.startsWith('/mcp')) return 'mcp';
    return 'chat';
  }, [pathname]);

  const handleSettingsClick = () => setSettingsModalOpen(true);
  const handleSettingsModalClose = () => setSettingsModalOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('登出接口调用失败:', error);
    } finally {
      // clearUserInfo 会自动清除 localStorage 和 cookie
      clearUserInfo();
      // 主动跳转到登录页（中间件会拦截并重定向）
      window.location.href = '/login';
    }
  };

  // 始终渲染完整布局（中间件会控制页面访问权限）
  return (
    <div className={styles.container}>
      <HeaderComponent
        selectedTab={selectedTab}
        onSettingsClick={handleSettingsClick}
        isLogin={isLogin}
        onLogout={handleLogout}
        userInfo={userInfo}
      />
      <main className={styles.main}>
        {children}
      </main>
      <SettingsModal
        open={settingsModalOpen}
        onClose={handleSettingsModalClose}
        userInfo={userInfo}
      />
    </div>
  );
};

export default AppMain;
