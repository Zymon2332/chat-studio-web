import { MenuProps, Dropdown } from "antd";
import React, { useRef } from "react";

import {
  PlusOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  SlackCircleFilled,
} from "@ant-design/icons";
import { Sender, Attachments, AttachmentsProps } from "@ant-design/x";
import { uploadFile } from "@/lib/api/upload";
import ModelSelectButton from "@/components/ModelSelectButton";

import styles from "./ChatMessageInput.module.css";

import {
  setDefaultModel,
} from "@/lib/api/models";

import type {
  ModelListItem,
  DefaultModel,
  ModelProviderWithModels,
} from "@/lib/api/models";

interface ChatMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (
    message: string,
    uploadId?: string,
    contentType?: string,
    fileUrl?: string
  ) => void;
  disabled?: boolean;
  loading?: boolean;
  onCancel?: () => void;
  selectedModel?: ModelListItem | null;
  defaultModel?: DefaultModel | null;
  modelList?: ModelProviderWithModels[];
  onModelSelect?: (model: ModelListItem) => void;
  showGradientOverlay?: boolean;
}

const ChatMessageInput: React.FC<ChatMessageInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
  onCancel,
  selectedModel,
  defaultModel,
  modelList,
  onModelSelect,
  showGradientOverlay = true,
}) => {
  const [uploadId, setUploadId] = React.useState<string | undefined>(undefined);
  const [contentType, setContentType] = React.useState<string | undefined>(undefined);
  const [fileName, setFileName] = React.useState<string | undefined>(undefined);
  const [uploading, setUploading] = React.useState(false);

  const [attachmentItems, setAttachmentItems] = React.useState<
    NonNullable<AttachmentsProps["items"]>
  >([]);
  const [open, setOpen] = React.useState(false);

  const attachmentsRef = useRef<any>(null);

  React.useEffect(() => {
    if (attachmentItems.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [attachmentItems.length]);

  const handleFileUpload = async (file: File, type: string) => {
    if (uploading) return;

    const tempUid = Date.now().toString();
    const newItem: NonNullable<AttachmentsProps["items"]>[number] = {
      uid: tempUid,
      name: file.name,
      status: "uploading",
      url: URL.createObjectURL(file),
      originFileObj: file as any,
      percent: 0,
    };

    setAttachmentItems([newItem]);
    setUploading(true);

    const timer = setInterval(() => {
      setAttachmentItems((prev) => {
        const item = prev.find((i) => i.uid === tempUid);
        if (!item || item.status !== "uploading") return prev;

        const nextPercent = (item.percent || 0) + 10;
        if (nextPercent >= 90) return prev;

        return prev.map((i) =>
          i.uid === tempUid ? { ...i, percent: nextPercent } : i
        );
      });
    }, 100);

    try {
      const uploadId = await uploadFile(file);

      clearInterval(timer);
      setUploadId(uploadId);
      setContentType(type);
      setFileName(file.name);

      setAttachmentItems((prev) =>
        prev.map((item) =>
          item.uid === tempUid ? { ...item, status: "done", percent: 100 } : item
        )
      );
    } catch (error) {
      console.error(error);
      clearInterval(timer);

      setAttachmentItems((prev) =>
        prev.map((item) =>
          item.uid === tempUid ? { ...item, status: "error" } : item
        )
      );
      setUploadId(undefined);
      setContentType(undefined);
      setFileName(undefined);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = (accept: string, type: string) => {
    if (attachmentsRef.current) {
      attachmentsRef.current.select({ accept });
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFileUpload(file, type);
      };
      input.click();
    }
  };

  const clearUpload = () => {
    setUploadId(undefined);
    setContentType(undefined);
    setFileName(undefined);
    setAttachmentItems([]);
  };

  // 处理模型选择，同时设置为默认模型
  const handleModelSelect = async (model: ModelListItem) => {
    // 先调用父组件的回调
    if (onModelSelect) {
      onModelSelect(model);
    }
    
    // 然后调用设置默认模型的接口
    try {
      await setDefaultModel(model.id);
    } catch (error) {
      console.error("设置默认模型失败:", error);
    }
  };

  const uploadItems: MenuProps["items"] = [
    {
      key: "image",
      label: "图片",
      icon: <FileImageOutlined style={{ fontSize: 16 }} />,
      onClick: () => {
        (window as any)._currentUploadType = "IMAGE";
        triggerFileSelect("image/*", "IMAGE");
      },
    },
    {
      key: "pdf",
      label: "文档",
      icon: <FilePdfOutlined style={{ fontSize: 16 }} />,
      onClick: () => {
        (window as any)._currentUploadType = "PDF";
        triggerFileSelect(".pdf", "PDF");
      },
    },
    {
      key: "video",
      label: "视频",
      icon: <VideoCameraOutlined style={{ fontSize: 16 }} />,
      onClick: () => {
        (window as any)._currentUploadType = "VIDEO";
        triggerFileSelect("video/*", "VIDEO");
      },
    },
    {
      key: "audio",
      label: "音频",
      icon: <AudioOutlined style={{ fontSize: 16 }} />,
      onClick: () => {
        (window as any)._currentUploadType = "AUDIO";
        triggerFileSelect("audio/*", "AUDIO");
      },
    },
  ];

  const attachmentsProps: AttachmentsProps = {
    beforeUpload(file) {
      const type = (window as any)._currentUploadType || "FILE";
      handleFileUpload(file, type);
      return false;
    },
    items: attachmentItems,
    onChange({ fileList }) {
      setAttachmentItems(fileList);
      if (fileList.length === 0) {
        clearUpload();
      }
    },
    getDropContainer: () => document.body,
    maxCount: 1,
  };

  const senderHeader = (
    <Sender.Header open={open} onOpenChange={setOpen}>
      <Attachments {...attachmentsProps} ref={attachmentsRef} />
    </Sender.Header>
  );

  const canSend = !disabled && !uploading && (value.trim() || uploadId);

  return (
    <div className={styles.inputWrapper}>
      {showGradientOverlay && <div className={styles.gradientOverlay} />}
      <div className={styles.wrapper}>
        <Sender
          header={fileName || uploading ? senderHeader : undefined}
          value={value}
          onChange={onChange}
          placeholder="输入消息..."
          allowSpeech={true}
          disabled={disabled}
          autoSize={{ minRows: 1, maxRows: 3 }}
          styles={{
            root: {
              borderRadius: 20,
              boxShadow: 'none',
              border: 'none',
              background: 'transparent',
            },
            input: {
              fontSize: 14,
              lineHeight: 1.5,
              padding: '10px 14px',
              fontWeight: 400,
              color: 'rgba(0, 0, 0, 0.85)',
            },
          }}
          suffix={false}
          submitType="enter"
          onSubmit={(val) => {
            if (loading || uploading) return;
            if (!val.trim() && !uploadId) return;

            const fileUrl = attachmentItems.length > 0 ? attachmentItems[0].url : undefined;
            onSubmit(val, uploadId, contentType, fileUrl);
            clearUpload();
          }}
          onCancel={onCancel}
          footer={(_, { components }) => {
            const { SendButton, LoadingButton } = components;
            return (
              <div className={styles.footer}>
                <div className={styles.footerLeft}>
                  <Dropdown
                    menu={{ items: uploadItems }}
                    placement="topLeft"
                    trigger={["click"]}
                  >
                    <button className={styles.iconButton} aria-label="上传文件">
                      <PlusOutlined style={{ fontSize: 16 }} />
                    </button>
                  </Dropdown>

                  <div className={styles.modelSelectorDivider} />

                  <ModelSelectButton
                    selectedModel={selectedModel}
                    defaultModel={defaultModel}
                    modelList={modelList}
                    onModelSelect={handleModelSelect}
                  />
                </div>

                {loading ? (
                  <LoadingButton type="primary" />
                ) : (
                  <SendButton type="primary" icon={<SlackCircleFilled />} disabled={!canSend} />
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default ChatMessageInput;
