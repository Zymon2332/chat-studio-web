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
          borderRadius: 6,
        },
        algorithm: antTheme.defaultAlgorithm,
        components: {
          Conversations: {
            creationBgColor: "rgba(63, 81, 181, 0.05)",
            creationBorderColor: "rgba(63, 81, 181, 0.15)",
            creationHoverColor: "rgba(63, 81, 181, 0.12)",
            shortcutKeyTextColor: "rgba(63, 81, 181, 0.65)",
          },
          Sender: {
            colorBgSlot: "rgba(63, 81, 181, 0.05)",
            colorBorderSlot: "rgba(63, 81, 181, 0.15)",
            colorBorderInput: "rgba(63, 81, 181, 0.15)",
          },
          Think: {
            colorTextBlink: "#3F51B5",
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
