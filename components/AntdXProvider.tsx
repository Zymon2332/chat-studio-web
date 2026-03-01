"use client";

import React from "react";
import { XProvider } from "@ant-design/x";
import { theme as antTheme, App } from "antd";

// Background：#F5F5F5

// Primary：#3F51B5

// Accent：#FF4081

// Text：#333333

export const AntdXProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <XProvider
      theme={{
        cssVar: { key: 'ant' },
        token: {
        },
        algorithm: antTheme.defaultAlgorithm,
        components: {
          Conversations: {
          },
          Sender: {
          },
          Think: {
          },
        },
      }}
    >
      <App>
        {children}
      </App>
    </XProvider>
  );
};
