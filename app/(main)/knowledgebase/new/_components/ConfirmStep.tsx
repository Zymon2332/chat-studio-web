'use client';

import React from 'react';
import { Descriptions, Space, Tag, theme } from 'antd';
import styles from '../../_styles/knowledgebase-wizard.module.css';

interface RetrievalModeConfig {
  value: string;
  label: string;
}

const RETRIEVAL_MODES: RetrievalModeConfig[] = [
  { value: 'EMBEDDING', label: '向量检索' },
  { value: 'FULL_TEXT', label: '全文检索' },
  { value: 'HYBRID', label: '混合检索' },
];

interface FusionStrategyConfig {
  value: string;
  label: string;
}

const FUSION_STRATEGIES: FusionStrategyConfig[] = [
  { value: 'RRF', label: 'RRF' },
  { value: 'WEIGHT', label: '加权融合' },
  { value: 'RERANK', label: 'Rerank' },
];

interface OptionItem {
  label: string;
  value: string;
}

const knowledgeBaseTypeOptions: OptionItem[] = [
  { label: '文档检索', value: 'DOCUMENT' },
  { label: '视频检索', value: 'VIDEO' },
  { label: '图片检索', value: 'IMAGE' },
];

const responseTypeOptions: OptionItem[] = [
  { label: '基础响应', value: 'BASIC' },
  { label: '多模态响应', value: 'MULTIMODAL' },
];

const getTagLabel = (tagValue: string): string => {
  try {
    const parsed = JSON.parse(tagValue) as { name?: string };
    return parsed.name || tagValue;
  } catch {
    return tagValue;
  }
};

interface ConfirmStepProps {
  values: any;
}

const ConfirmStep: React.FC<ConfirmStepProps> = ({ values }) => {
  const { token } = theme.useToken();
  
  const showWeightParams = values?.retrievalMode === 'HYBRID' && values?.fusionStrategy === 'WEIGHT';
  const showRerankParams = values?.fusionStrategy === 'RERANK';

  return (
    <div className={styles.confirmPanel}>
            <Descriptions
              bordered
              column={1}
              size="small"
              styles={{
                label: {
                  backgroundColor: token.colorFillQuaternary,
                  width: 140,
                  fontWeight: 500,
                },
                content: {
                  backgroundColor: token.colorBgContainer,
                }
              }}
            >
              <Descriptions.Item label="知识库名称">{values.name || '--'}</Descriptions.Item>
              <Descriptions.Item label="知识库描述">{values.description || '--'}</Descriptions.Item>
              <Descriptions.Item label="标签">
                {(values.tags || []).length > 0 ? (
                  <Space size={[0, 8]} wrap>
                    {(values.tags || []).map((tag: string) => (
                      <Tag key={tag} bordered={false} color="processing">{getTagLabel(tag)}</Tag>
                    ))}
                  </Space>
                ) : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="知识库类型">
                {knowledgeBaseTypeOptions.find((option) => option.value === values.knowledgeBaseType)?.label || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="检索响应">
                {responseTypeOptions.find((option) => option.value === values.responseType)?.label || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="检索模式">
                {RETRIEVAL_MODES.find((mode) => mode.value === values.retrievalMode)?.label || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="Top K">{values.topK ?? 5}</Descriptions.Item>
              <Descriptions.Item label="相似度阈值">{values.embedMinScore ?? 0.5}</Descriptions.Item>
              
              {values.fusionStrategy && (
                <Descriptions.Item label="数据融合策略">
                  {FUSION_STRATEGIES.find((s) => s.value === values.fusionStrategy)?.label || values.fusionStrategy}
                </Descriptions.Item>
              )}

              {showWeightParams && (
                <>
                  <Descriptions.Item label="稠密权重">{values.denseWeight ?? 0.5}</Descriptions.Item>
                  <Descriptions.Item label="稀疏权重">{values.sparseWeight ?? 0.5}</Descriptions.Item>
                </>
              )}
              
              {showRerankParams && (
                <>
                  <Descriptions.Item label="Rerank Top N">{values.topN ?? 3}</Descriptions.Item>
                  <Descriptions.Item label="Rerank 相似度阈值">{values.rerankMinScore ?? 0.5}</Descriptions.Item>
                </>
              )}
            </Descriptions>
    </div>
  );
};

export default ConfirmStep;
