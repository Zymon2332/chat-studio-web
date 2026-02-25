import {
  Dropdown,
  Input,
  MenuProps,
  Tooltip,
} from "antd";
import React from "react";

import {
  BulbOutlined,
  EyeOutlined,
  GlobalOutlined,
  PictureOutlined,
  RobotOutlined,
  ToolOutlined,
} from "@ant-design/icons";

import styles from "./ModelSelectButton.module.css";

import type {
  ModelListItem,
  ModelProviderWithModels,
  DefaultModel,
} from "@/lib/api/models";

interface ModelSelectButtonProps {
  selectedModel?: ModelListItem | null;
  defaultModel?: DefaultModel | null;
  modelList?: ModelProviderWithModels[];
  onModelSelect?: (model: ModelListItem) => void;
  onDropdownOpen?: () => void;
}

const abilityConfig: Record<string, { icon: React.ReactNode; title: string; color: string }> = {
  THINKING: { icon: <BulbOutlined />, title: "深度思考", color: "#faad14" },
  VISUAL_UNDERSTANDING: { icon: <EyeOutlined />, title: "视觉理解", color: "#52c41a" },
  IMAGE_GENERATION: { icon: <PictureOutlined />, title: "图片生成", color: "#722ed1" },
  TOOL: { icon: <ToolOutlined />, title: "工具调用", color: "#1890ff" },
  NETWORK: { icon: <GlobalOutlined />, title: "联网搜索", color: "#096dd9" },
};

const ModelSelectButton: React.FC<ModelSelectButtonProps> = ({
  selectedModel,
  defaultModel,
  modelList,
  onModelSelect,
  onDropdownOpen,
}) => {
  const [searchValue, setSearchValue] = React.useState("");

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

        const filteredModels = provider.models.filter((model) =>
          model.modelName.toLowerCase().includes(lowerSearch)
        );

        if (providerMatches) return provider;
        if (filteredModels.length > 0) {
          return { ...provider, models: filteredModels };
        }
        return null;
      })
      .filter(Boolean) as ModelProviderWithModels[];
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

    return filteredModelList.map((provider) => ({
      key: provider.providerId,
      type: "group" as const,
      label: provider.providerName,
      children: provider.models.map((model) => {
        const iconUrl = model.icon || provider.icon;
        const abilities = model.abilities?.split(",").map((a) => a.trim()) || [];

        return {
          key: String(model.id),
          label: (
            <div className={styles.menuItemLabel}>
              <span>{model.modelName}</span>
              {abilities.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                  {abilities.map((ability) => {
                    const config = abilityConfig[ability];
                    if (!config) return null;
                    return (
                      <Tooltip key={ability} title={config.title}>
                        <span style={{ color: config.color, fontSize: 12 }}>
                          {config.icon}
                        </span>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </div>
          ),
          icon: iconUrl ? (
            <img
              src={iconUrl}
              alt={model.modelName}
              className={styles.menuItemIcon}
            />
          ) : (
            <RobotOutlined />
          ),
          onClick: () =>
            onModelSelect?.({
              ...model,
              icon: iconUrl,
              providerId: provider.providerId,
            }),
        };
      }),
    }));
  }, [filteredModelList, onModelSelect, searchValue]);

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="topLeft"
      onOpenChange={(open) => {
        if (open) {
          setSearchValue("");
          onDropdownOpen?.();
        }
      }}
      dropdownRender={(menu) => (
        <div style={{ backgroundColor: "#fff", borderRadius: 12 }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <Input
              placeholder="搜索模型..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
              variant="borderless"
              className={styles.searchInput}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {menu}
        </div>
      )}
    >
      <div className={styles.cardContent}>
        <div className={styles.modelInfo}>
          {displayIcon ? (
            <img src={displayIcon} alt="icon" className={styles.modelIcon} />
          ) : (
            <div className={styles.fallbackIcon}>
              <RobotOutlined />
            </div>
          )}
          <span className={styles.modelName}>{displayModelName}</span>
        </div>
      </div>
    </Dropdown>
  );
};

export default ModelSelectButton;
