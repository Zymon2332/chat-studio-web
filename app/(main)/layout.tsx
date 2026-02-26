import type { Metadata } from "next";
import "../../styles/globals.css";
import React from "react";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AntdXProvider } from "../../components/AntdXProvider";
import { UserProvider } from "@/contexts/UserContext";
import AppMain from "../../components/AppMain";

export const metadata: Metadata = {
  title: "Chat Studio",
  description: "A modern chat application built with Next.js",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AntdRegistry>
      <AntdXProvider>
        <UserProvider>
          <AppMain>{children}</AppMain>
        </UserProvider>
      </AntdXProvider>
    </AntdRegistry>
  );
}
