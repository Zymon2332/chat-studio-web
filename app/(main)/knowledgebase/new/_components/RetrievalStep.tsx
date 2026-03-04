'use client';

import React from 'react';
import { Form, Input, Slider, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import styles from '../../_styles/knowledgebase-wizard.module.css';

interface RetrievalModeConfig {
  value: string;
  label: string;
  description: string;
}

interface FusionStrategyConfig {
  value: string;
  label: string;
  description: string;
}

const RETRIEVAL_MODES: RetrievalModeConfig[] = [
  {
    value: 'EMBEDDING',
    label: '向量检索',
    description: '通过生成查询嵌入并查询与其向量表示最相似的文本分段。',
  },
  {
    value: 'FULL_TEXT',
    label: '全文检索',
    description: '索引文档中的所有词汇，从而允许用户查询任意词汇，并返回包含这些词汇的文本片段。',
  },
  {
    value: 'HYBRID',
    label: '混合检索',
    description: '同时执行全文检索和向量检索，并应用重排序步骤。',
  },
];

const FUSION_STRATEGIES: FusionStrategyConfig[] = [
  {
    value: 'RRF',
    label: 'RRF',
    description: 'Reciprocal Rank Fusion，倒数排名融合算法，适用于多种检索结果的综合排序。',
  },
  {
    value: 'WEIGHT',
    label: '加权融合',
    description: '根据配置的权重对向量检索和全文检索的结果进行加权合并。',
  },
  {
    value: 'RERANK',
    label: 'Rerank',
    description: '使用重排序模型对混合检索结果进行重新排序，获取最相关的内容。',
  },
];

interface RetrievalStepProps {
  form: any;
  selectedRetrievalMode?: string;
  topK: number;
  embedMinScore: number;
  topN: number;
  rerankMinScore: number;
  denseWeight: number;
  sparseWeight: number;
  onTopKChange: (val: number) => void;
  onEmbedMinScoreChange: (val: number) => void;
  onTopNChange: (val: number) => void;
  onRerankMinScoreChange: (val: number) => void;
  onDenseWeightChange: (val: number) => void;
  onSparseWeightChange: (val: number) => void;
}

const RetrievalStep: React.FC<RetrievalStepProps> = ({
  form,
  selectedRetrievalMode,
  topK,
  embedMinScore,
  topN,
  rerankMinScore,
  denseWeight,
  sparseWeight,
  onTopKChange,
  onEmbedMinScoreChange,
  onTopNChange,
  onRerankMinScoreChange,
  onDenseWeightChange,
  onSparseWeightChange,
}) => {
  const selectedFusionStrategy = Form.useWatch('fusionStrategy', form);
  const showWeightParams = selectedRetrievalMode === 'HYBRID' && selectedFusionStrategy === 'WEIGHT';

  React.useEffect(() => {
    const invalidForHybrid = selectedRetrievalMode === 'HYBRID' && selectedFusionStrategy === 'RERANK';
    const invalidForNonHybrid = selectedRetrievalMode !== 'HYBRID' && selectedFusionStrategy === 'WEIGHT';
    if (invalidForHybrid || invalidForNonHybrid) {
      form.setFieldValue('fusionStrategy', 'RRF');
    }
  }, [form, selectedFusionStrategy, selectedRetrievalMode]);

  return (
    <div>
      <div className={styles.sectionTitle}>检索模式</div>
      <div className={styles.optionGrid}>
        {RETRIEVAL_MODES.map((mode) => {
          const selected = selectedRetrievalMode === mode.value;
          return (
            <div
              key={mode.value}
              className={`${styles.optionItem} ${selected ? styles.optionItemActive : ''}`}
              onClick={() => form.setFieldValue('retrievalMode', mode.value)}
            >
              <span className={`${styles.optionRadio} ${selected ? styles.optionRadioActive : ''}`} />
              <div className={styles.optionLabelRow}>
                <span className={styles.optionTitle}>{mode.label}</span>
              </div>
              <div className={styles.optionDesc}>{mode.description}</div>
            </div>
          );
        })}
      </div>
      <Form.Item
        name="retrievalMode"
        rules={[{ required: true, message: '请选择检索模式' }]}
        style={{ display: 'none' }}
      >
        <Input />
      </Form.Item>

      {selectedRetrievalMode && (
        <>
          <div className={styles.sectionTitle}>检索参数配置</div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Top K
                  <Tooltip title="用于筛选与用户问题相似度最高的文本片段。系统同时会根据选用模型上下文窗口大小动态调整分段数量。">
                    <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                  </Tooltip>
                </div>
                <Form.Item name="topK" noStyle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={topK}
                      onChange={(e) => onTopKChange(Number(e.target.value))}
                      style={{ width: 80 }}
                    />
                    <Slider
                      min={1}
                      max={10}
                      value={topK}
                      onChange={(val) => onTopKChange(val)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Form.Item>
              </div>

              <div>
                <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  相似度阈值
                  <Tooltip title="用于设置文本片段筛选的相似度阈值。">
                    <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                  </Tooltip>
                </div>
                <Form.Item name="embedMinScore" noStyle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={embedMinScore}
                      onChange={(e) => onEmbedMinScoreChange(Number(e.target.value))}
                      style={{ width: 80 }}
                    />
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={embedMinScore}
                      onChange={(val) => onEmbedMinScoreChange(val)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </Form.Item>
              </div>
            </div>
          </div>
          
          <div className={styles.sectionTitle}>数据融合策略</div>
          <div className={styles.optionGrid}>
            {FUSION_STRATEGIES.filter((strategy) => {
              if (selectedRetrievalMode === 'HYBRID') {
                return strategy.value === 'RRF' || strategy.value === 'WEIGHT';
              }
              return strategy.value === 'RRF' || strategy.value === 'RERANK';
            }).map((strategy) => {
              const selected = selectedFusionStrategy === strategy.value;
              return (
                <div
                  key={strategy.value}
                  className={`${styles.optionItem} ${selected ? styles.optionItemActive : ''}`}
                  onClick={() => form.setFieldValue('fusionStrategy', strategy.value)}
                >
                  <span className={`${styles.optionRadio} ${selected ? styles.optionRadioActive : ''}`} />
                  <div className={styles.optionLabelRow}>
                    <span className={styles.optionTitle}>{strategy.label}</span>
                  </div>
                  <div className={styles.optionDesc}>{strategy.description}</div>
                </div>
              );
            })}
          </div>
          <Form.Item
            name="fusionStrategy"
            rules={[{ required: true, message: '请选择数据融合策略' }]}
            style={{ display: 'none' }}
          >
            <Input />
          </Form.Item>

          {showWeightParams && (
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    稠密权重
                    <Tooltip title="向量检索结果在加权融合中的占比。">
                      <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                    </Tooltip>
                  </div>
                  <Form.Item name="denseWeight" noStyle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={denseWeight}
                        onChange={(e) => onDenseWeightChange(Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={denseWeight}
                        onChange={(val) => onDenseWeightChange(val)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Form.Item>
                </div>

                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    稀疏权重
                    <Tooltip title="全文检索结果在加权融合中的占比。">
                      <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                    </Tooltip>
                  </div>
                  <Form.Item name="sparseWeight" noStyle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={sparseWeight}
                        onChange={(e) => onSparseWeightChange(Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={sparseWeight}
                        onChange={(val) => onSparseWeightChange(val)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Form.Item>
                </div>
              </div>
            </div>
          )}
          
          {selectedFusionStrategy === 'RERANK' && (
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Top N
                    <Tooltip title="重排序后返回的最相似文本片段数量。">
                      <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                    </Tooltip>
                  </div>
                  <Form.Item name="topN" noStyle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={topN}
                        onChange={(e) => onTopNChange(Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                      <Slider
                        min={1}
                        max={10}
                        value={topN}
                        onChange={(val) => onTopNChange(val)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Form.Item>
                </div>

                <div>
                  <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Rerank 相似度阈值
                    <Tooltip title="用于设置重排序后文本片段的相似度阈值。">
                      <QuestionCircleOutlined style={{ color: '#999', fontSize: 14 }} />
                    </Tooltip>
                  </div>
                  <Form.Item name="rerankMinScore" noStyle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={rerankMinScore}
                        onChange={(e) => onRerankMinScoreChange(Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                      <Slider
                        min={0}
                        max={1}
                        step={0.1}
                        value={rerankMinScore}
                        onChange={(val) => onRerankMinScoreChange(val)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </Form.Item>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RetrievalStep;
