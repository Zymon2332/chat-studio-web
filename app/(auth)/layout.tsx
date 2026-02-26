import type { Metadata } from "next";
import "../../styles/globals.css";
import React from "react";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AntdXProvider } from "../../components/AntdXProvider";
import { UserProvider } from "@/contexts/UserContext";

export const metadata: Metadata = {
  title: "登录 - Chat Studio",
  description: "登录 Chat Studio",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AntdRegistry>
      <AntdXProvider>
        <UserProvider>
          {children}
        </UserProvider>
      </AntdXProvider>
    </AntdRegistry>
  );
}
