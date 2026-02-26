import React from 'react';
import { ToolOutlined } from '@ant-design/icons';
import { ThoughtChain } from '@ant-design/x';
import type { ToolRequest, ToolResponse } from '@/lib/api/conversations';
import styles from './ToolChain.module.css';

interface ToolChainProps {
  toolRequests: ToolRequest[];
  toolResponses?: ToolResponse[];
}

const ToolChain: React.FC<ToolChainProps> = ({ toolRequests, toolResponses = [] }) => {
  if (toolRequests.length === 0) return null;

  const items = toolRequests.map((toolReq) => {
    const toolResult = toolResponses.find((result) => result.id === toolReq.id);

    const content = toolResult && !toolResult.isError ? (
      <div className={styles.toolResultSuccess}>
        {toolResult.text || '执行成功'}
      </div>
    ) : null;

    return {
      key: `tool-${toolReq.id}`,
      title: toolReq.name,
      icon: <ToolOutlined />,
      status: (toolResult
        ? toolResult.isError
          ? 'error'
          : 'success'
        : 'loading') as 'loading' | 'success' | 'error',
      collapsible: true,
      content,
    };
  });

  return (
    <ThoughtChain
      items={items}
      defaultExpandedKeys={[]}
    />
  );
};

export default React.memo(ToolChain);
