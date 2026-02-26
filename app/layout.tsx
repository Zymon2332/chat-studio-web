import type { Metadata } from "next";
import "../styles/globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "Chat Studio",
  description: "A modern chat application built with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
