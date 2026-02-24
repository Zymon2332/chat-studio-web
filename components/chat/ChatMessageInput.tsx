import { Dropdown, MenuProps, Input } from "antd";
import React, { useRef } from "react";

import {
  PlusOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  SendOutlined,
  LoadingOutlined,
  RobotOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { Sender, Attachments, AttachmentsProps } from "@ant-design/x";
import { uploadFile } from "@/lib/api/upload";

import styles from "./ChatMessageInput.module.css";

import type {
  ModelListItem,
  DefaultModel,
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
  modelList?: any[];
  onModelSelect?: (model: ModelListItem) => void;
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
}) => {
  const [uploadId, setUploadId] = React.useState<string | undefined>(undefined);
  const [contentType, setContentType] = React.useState<string | undefined>(undefined);
  const [fileName, setFileName] = React.useState<string | undefined>(undefined);
  const [uploading, setUploading] = React.useState(false);

  const [attachmentItems, setAttachmentItems] = React.useState<
    NonNullable<AttachmentsProps["items"]>
  >([]);
  const [open, setOpen] = React.useState(false);

  const [searchValue, setSearchValue] = React.useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = React.useState(false);

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

  const handleSend = () => {
    if (loading || uploading || disabled) return;
    if (!value.trim() && !uploadId) return;

    const fileUrl = attachmentItems.length > 0 ? attachmentItems[0].url : undefined;
    onSubmit(value, uploadId, contentType, fileUrl);
    clearUpload();
  };

  const canSend = !disabled && !uploading && (value.trim() || uploadId);

  const displayModelName = selectedModel
    ? selectedModel.modelName
    : defaultModel
    ? defaultModel.modelName
    : "选择模型";

  const displayIcon = selectedModel?.icon || defaultModel?.icon;

  const filteredModelList = React.useMemo(() => {
    if (!modelList) return [];
    if (!searchValue) return modelList;

    const lowerSearch = searchValue.toLowerCase();

    return modelList
      .map((provider) => {
        const providerMatches = provider.providerName
          .toLowerCase()
          .includes(lowerSearch);

        const filteredModels = provider.models.filter((model: any) =>
          model.modelName.toLowerCase().includes(lowerSearch)
        );

        if (providerMatches) {
          return provider;
        }

        if (filteredModels.length > 0) {
          return {
            ...provider,
            models: filteredModels,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [modelList, searchValue]);

  const menuItems: MenuProps["items"] = React.useMemo(() => {
    if (!filteredModelList || filteredModelList.length === 0) {
      return [
        {
          key: "empty",
          label: <span>{searchValue ? "未找到相关模型" : "暂无可用模型"}</span>,
          disabled: true,
        },
      ];
    }

    return filteredModelList.map((provider: any) => ({
      key: provider.providerId,
      type: "group",
      label: provider.providerName,
      children: provider.models.map((model: any) => {
        const iconUrl = model.icon || provider.icon;
        return {
          key: String(model.id),
          label: <span>{model.modelName}</span>,
          icon: iconUrl ? (
            <img
              src={iconUrl}
              alt={model.modelName}
              className={styles.menuItemIcon}
              style={{ width: 20, height: 20, borderRadius: 4 }}
            />
          ) : (
            <RobotOutlined />
          ),
          onClick: () =>
            onModelSelect &&
            onModelSelect({
              ...model,
              icon: iconUrl,
              providerId: provider.providerId,
            }),
        };
      }),
    }));
  }, [filteredModelList, onModelSelect, searchValue]);

  return (
    <div className={styles.inputWrapper}>
      <div className={styles.gradientOverlay} />
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
          submitType="enter"
          suffix={false}
          onSubmit={(val) => {
            console.log('onSubmit called with:', val, 'loading:', loading, 'uploading:', uploading, 'value:', value);
            if (loading || uploading) return;
            if (!val.trim() && !uploadId) return;

            const fileUrl = attachmentItems.length > 0 ? attachmentItems[0].url : undefined;
            onSubmit(val, uploadId, contentType, fileUrl);
            clearUpload();
          }}
          onCancel={onCancel}
          footer={() => (
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <Dropdown
                menu={{ items: uploadItems }}
                placement="topLeft"
                trigger={["click"]}
              >
                <button className={styles.iconButton}>
                  <PlusOutlined style={{ fontSize: 16 }} />
                </button>
              </Dropdown>

              <div className={styles.modelSelectorDivider} />

              <Dropdown
                menu={{ items: menuItems }}
                trigger={["click"]}
                placement="topLeft"
                open={modelDropdownOpen}
                onOpenChange={(open) => {
                  setModelDropdownOpen(open);
                  if (open) {
                    setSearchValue("");
                  }
                }}
                popupRender={(menu) => (
                  <div className={styles.modelDropdownPopup}>
                    <div className={styles.modelSearchBox}>
                      <Input
                        placeholder="搜索模型..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        allowClear
                        variant="borderless"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    {React.isValidElement(menu) ? React.cloneElement(menu as React.ReactElement<any>) : menu}
                  </div>
                )}
              >
                <button className={styles.modelButton}>
                  {displayIcon ? (
                    <img src={displayIcon} alt="icon" className={styles.modelButtonIcon} />
                  ) : (
                    <RobotOutlined className={styles.modelButtonIcon} />
                  )}
                  <span className={styles.modelButtonText}>{displayModelName}</span>
                  <DownOutlined className={styles.modelButtonArrow} />
                </button>
              </Dropdown>
            </div>

            <button
              onClick={handleSend}
              disabled={!canSend}
              className={styles.sendButton}
            >
              {loading ? (
                <LoadingOutlined style={{ fontSize: 16 }} />
              ) : (
                <SendOutlined style={{ fontSize: 14 }} />
              )}
            </button>
          </div>
        )}
      />
      </div>
    </div>
  );
};

export default ChatMessageInput;
