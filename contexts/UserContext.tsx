"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { UserInfo } from "@/lib/api";

interface UserContextType {
  userInfo: UserInfo | null;
  isLogin: boolean;
  updateUserInfo: () => void;
  clearUserInfo: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLogin, setIsLogin] = useState(false);

  // 从 localStorage 加载用户信息
  const loadUserInfo = useCallback(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const userInfoStr = localStorage.getItem('userInfo');
      
      if (token && userInfoStr) {
        try {
          const parsedUserInfo = JSON.parse(userInfoStr);
          setUserInfo(parsedUserInfo);
          setIsLogin(true);
        } catch {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          setUserInfo(null);
          setIsLogin(false);
        }
      } else {
        if (!token) localStorage.removeItem('authToken');
        if (!userInfoStr) localStorage.removeItem('userInfo');
        setUserInfo(null);
        setIsLogin(false);
      }
    }
  }, []);

  // 清除用户信息
  const clearUserInfo = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      // 同时清除 cookie（供中间件使用）
      document.cookie = 'authToken=; path=/; max-age=0';
    }
    setUserInfo(null);
    setIsLogin(false);
  }, []);

  // 更新用户信息（从 localStorage 重新读取）
  const updateUserInfo = useCallback(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  // 组件挂载时加载用户信息
  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  return (
    <UserContext.Provider value={{ userInfo, isLogin, updateUserInfo, clearUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
