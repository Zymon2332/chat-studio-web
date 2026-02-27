"use client";
import React, { createContext, useContext } from "react";
import XMarkdown, { type ComponentProps } from "@ant-design/x-markdown";
import Latex from "@ant-design/x-markdown/plugins/Latex";
import { CodeHighlighter, Mermaid } from "@ant-design/x";
import { Button, Space, Tooltip, message, Spin } from "antd";
import {
  CopyOutlined,
  CheckOutlined,
  EyeOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import "@ant-design/x-markdown/themes/light.css";
import request from "../lib/api/request";
import styles from "./MarkdownRenderer.module.css";

// 创建预览上下文
interface PreviewContextType {
  onPreview?: (content: string) => void;
}

const PreviewContext = createContext<PreviewContextType>({});

const Code: React.FC<ComponentProps> = (props) => {
  const { className, children, block } = props;
  const lang = (className?.match(/language-(\w+)/)?.[1] || "").toLowerCase();
  const [copied, setCopied] = React.useState(false);
  const [output, setOutput] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { onPreview } = useContext(PreviewContext);

  if (typeof children !== "string") return null;

  // Keep inline code as inline element to avoid unexpected line breaks.
  if (!block) {
    return <code className={className}>{children}</code>;
  }

  if (lang === "mermaid") {
    return <Mermaid>{children}</Mermaid>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    message.success("复制成功");
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(children);
    } else {
      message.info("预览功能暂不可用");
    }
  };

  const handleRun = async () => {
    if (loading) return;

    const codeType = lang === "javascript" || lang === "js" ? "JS" : "PYTHON";
    setLoading(true);
    setOutput(null);

    try {
      const res = await request.post("/code/run", {
        codeType,
        code: children,
      });
      // 确保结果是字符串
      const resultStr =
        typeof res === "string" ? res : JSON.stringify(res, null, 2);
      setOutput(resultStr || "无输出");
    } catch (error) {
      console.error(error);
      message.error("代码执行失败");
      setOutput(error instanceof Error ? error.message : "执行出错");
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <div className={styles.codeHeader}>
      <span className={styles.languageLabel}>{lang || "text"}</span>
      <Space size={4}>
        {(lang === "python" ||
          lang === "py" ||
          lang === "javascript" ||
          lang === "js") && (
          <Tooltip title="运行">
            <Button
              type="text"
              size="small"
              icon={loading ? <Spin size="small" /> : <PlayCircleOutlined />}
              onClick={handleRun}
              disabled={loading}
            />
          </Tooltip>
        )}
        {lang === "html" && (
          <Tooltip title="预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={handlePreview}
            />
          </Tooltip>
        )}
        <Tooltip title={copied ? "已复制" : "复制"}>
          <Button
            type="text"
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
          />
        </Tooltip>
      </Space>
    </div>
  );

  return (
    <div>
      <CodeHighlighter lang={lang} header={header}>
        {children}
      </CodeHighlighter>
      {output !== null && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f5f5f5",
            borderTop: "1px solid #d9d9d9",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: "13px",
            maxHeight: "300px",
            overflow: "auto",
          }}
        >
          <div style={{ color: "#666", marginBottom: 4, fontSize: 12 }}>
            执行结果:
          </div>
          {output}
        </div>
      )}
    </div>
  );
};

// Markdown渲染组件
const MarkdownRendererInternal: React.FC<{
  content: string;
  onPreview?: (content: string) => void;
}> = React.memo(({ content, onPreview }) => {
  // 如果内容不是字符串，直接返回
  if (typeof content !== "string") {
    return content as React.ReactNode;
  }

  // 如果内容为空，返回空字符串
  if (!content) {
    return <div className={styles.markdownContent}></div>;
  }

  return (
    <PreviewContext.Provider value={{ onPreview }}>
      <div>
        <XMarkdown
          className="x-markdown-light"
          content={content}
          components={{ code: Code }}
          config={{ extensions: Latex() }}
          streaming={{
            hasNextChunk: true,
            enableAnimation: true,
            animationConfig: {
              easing: 'linear'
            }
          }}
        />
      </div>
    </PreviewContext.Provider>
  );
});

MarkdownRendererInternal.displayName = "MarkdownRendererInternal";

// Markdown渲染函数
export const renderMarkdown = (
  content: string,
  onPreview?: (content: string) => void,
): React.ReactNode => {
  // 如果内容不是字符串，直接返回
  if (typeof content !== "string") {
    return content as React.ReactNode;
  }

  // 如果内容为空，返回空字符串
  if (!content) {
    return "";
  }

  return <MarkdownRendererInternal content={content} onPreview={onPreview} />;
};

export default MarkdownRendererInternal;
