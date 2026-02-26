import React from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ToolRequest, ToolResponse } from "@/lib/api/conversations";
import styles from "./ToolChain.module.css";

interface ToolChainProps {
  toolRequests: ToolRequest[];
  toolResponses?: ToolResponse[];
}

const ToolChain: React.FC<ToolChainProps> = ({
  toolRequests,
  toolResponses = [],
}) => {
  if (toolRequests.length === 0) return null;

  const items = toolRequests.map((toolReq) => {
    const toolResult = toolResponses.find((result) => result.id === toolReq.id);

    const content =
      toolResult && !toolResult.isError ? (
        <div className={styles.toolResultSuccess}>
          {toolResult.text || "执行成功"}
        </div>
      ) : null;

    return {
      title: toolReq.name,
      status: (toolResult
        ? toolResult.isError
          ? "error"
          : "success"
        : "loading") as "loading" | "success" | "error",
      description: content,
    };
  });

  return <ThoughtChain items={items} />;
};

export default React.memo(ToolChain);
