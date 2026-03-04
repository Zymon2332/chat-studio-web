"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Spin,
  Steps,
  message,
} from 'antd';
import { useParams, useRouter } from 'next/navigation';
import {
  getKnowledgeBaseInfo,
  getKnowledgeBaseTags,
  updateKnowledgeBase,
  type CreateKnowledgeBaseParams,
  type UpdateKnowledgeBaseParams,
  type TagItem,
} from '@/lib/api';
import InfoStep from '../../new/_components/InfoStep';
import RetrievalStep from '../../new/_components/RetrievalStep';
import ConfirmStep from '../../new/_components/ConfirmStep';
import styles from '../../_styles/knowledgebase-wizard.module.css';

interface WizardFormValues {
  name: string;
  description?: string;
  tags?: string[];
  knowledgeBaseType: string;
  responseType: string;
  retrievalMode: string;
  topK: number;
  embedMinScore: number;
  fusionStrategy: string;
  topN?: number;
  rerankMinScore?: number;
  denseWeight?: number;
  sparseWeight?: number;
}

type KnowledgeBaseDetail = Awaited<ReturnType<typeof getKnowledgeBaseInfo>> & {
  type?: 'DOCUMENT' | 'VIDEO' | 'IMAGE';
  responseType?: 'BASIC' | 'MULTIMODAL';
  config?: Partial<CreateKnowledgeBaseParams['config']>;
};

const EditKnowledgeBasePage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const knowledgeBaseId = Number(params.id);
  const validKnowledgeBaseId = Number.isFinite(knowledgeBaseId) ? knowledgeBaseId : undefined;

  const [form] = Form.useForm<WizardFormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

  const selectedKnowledgeBaseType = Form.useWatch('knowledgeBaseType', form);
  const selectedResponseType = Form.useWatch('responseType', form);
  const selectedRetrievalMode = Form.useWatch('retrievalMode', form);

  const [topK, setTopK] = useState<number>(5);
  const [embedMinScore, setEmbedMinScore] = useState<number>(0.5);
  const [topN, setTopN] = useState<number>(3);
  const [rerankMinScore, setRerankMinScore] = useState<number>(0.5);
  const [denseWeight, setDenseWeight] = useState<number>(0.5);
  const [sparseWeight, setSparseWeight] = useState<number>(0.5);

  useEffect(() => {
    const formTopK = form.getFieldValue('topK');
    const formScore = form.getFieldValue('embedMinScore');
    const formTopN = form.getFieldValue('topN');
    const formRerankScore = form.getFieldValue('rerankMinScore');
    const formDenseWeight = form.getFieldValue('denseWeight');
    const formSparseWeight = form.getFieldValue('sparseWeight');
    if (formTopK !== undefined) setTopK(formTopK);
    if (formScore !== undefined) setEmbedMinScore(formScore);
    if (formTopN !== undefined) setTopN(formTopN);
    if (formRerankScore !== undefined) setRerankMinScore(formRerankScore);
    if (formDenseWeight !== undefined) setDenseWeight(formDenseWeight);
    if (formSparseWeight !== undefined) setSparseWeight(formSparseWeight);
  }, [selectedRetrievalMode]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setInitializing(true);

        const tagsData = await getKnowledgeBaseTags();
        if (!mounted) {
          return;
        }
        setAvailableTags(tagsData);

        const defaultValues: Partial<WizardFormValues> = {
          knowledgeBaseType: 'DOCUMENT',
          responseType: 'BASIC',
          retrievalMode: 'EMBEDDING',
          tags: [],
          topK: 5,
          embedMinScore: 0.5,
          fusionStrategy: 'RRF',
          topN: 3,
          rerankMinScore: 0.5,
          denseWeight: 0.5,
          sparseWeight: 0.5,
        };

        if (!validKnowledgeBaseId) {
          form.setFieldsValue(defaultValues);
          return;
        }

        const kbInfo = await getKnowledgeBaseInfo(validKnowledgeBaseId) as KnowledgeBaseDetail;
        if (!mounted) {
          return;
        }

        const kbConfig = kbInfo.config || {};

        form.setFieldsValue({
          ...defaultValues,
          name: kbInfo.name,
          description: kbInfo.description || '',
          tags: (kbInfo.tags || []).map((tag) => JSON.stringify(tag)),
          knowledgeBaseType: kbInfo.type || defaultValues.knowledgeBaseType,
          responseType: kbInfo.responseType || defaultValues.responseType,
          retrievalMode: kbConfig.retrievalMode || defaultValues.retrievalMode,
          topK: kbConfig.topK ?? defaultValues.topK,
          embedMinScore: kbConfig.embedMinScore ?? defaultValues.embedMinScore,
          fusionStrategy: kbConfig.fusionStrategy || defaultValues.fusionStrategy,
          topN: kbConfig.topN ?? defaultValues.topN,
          rerankMinScore: kbConfig.rerankMinScore ?? defaultValues.rerankMinScore,
          denseWeight: kbConfig.denseWeight ?? defaultValues.denseWeight,
          sparseWeight: kbConfig.sparseWeight ?? defaultValues.sparseWeight,
        });
      } catch {
        if (mounted) {
          message.error('初始化知识库配置失败，请稍后重试');
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [form, validKnowledgeBaseId]);

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        const fields: Array<keyof WizardFormValues> = ['name', 'description', 'tags', 'knowledgeBaseType'];
        if (form.getFieldValue('knowledgeBaseType') === 'DOCUMENT') {
          fields.push('responseType');
        }
        await form.validateFields(fields);
      }
      if (currentStep === 1) {
        await form.validateFields(['retrievalMode']);
      }
      setCurrentStep((prev) => Math.min(prev + 1, 2));
    } catch {
      // 表单项会展示校验信息
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCancel = () => {
    router.push('/knowledgebase');
  };

  const handleSubmit = async () => {
    if (!validKnowledgeBaseId) {
      message.error('缺少知识库 ID，无法保存');
      return;
    }

    const values = form.getFieldsValue(true) as WizardFormValues;
    setSubmitting(true);

    const processedTags = (values.tags || []).map((tag) => {
      try {
        return JSON.parse(tag) as { id?: number; name: string };
      } catch {
        return { name: tag };
      }
    });

    const config: CreateKnowledgeBaseParams['config'] = {
      retrievalMode: values.retrievalMode as 'EMBEDDING' | 'HYBRID' | 'FULL_TEXT',
      topK: values.topK,
      embedMinScore: values.embedMinScore,
      fusionStrategy: values.fusionStrategy as 'RRF' | 'WEIGHT' | 'RERANK',
    };

    if (values.fusionStrategy === 'RERANK') {
      config.topN = values.topN;
      config.rerankMinScore = values.rerankMinScore;
    }

    if (values.retrievalMode === 'HYBRID' && values.fusionStrategy === 'WEIGHT') {
      config.denseWeight = values.denseWeight;
      config.sparseWeight = values.sparseWeight;
    }

    const paramsToSubmit: UpdateKnowledgeBaseParams = {
      name: values.name,
      description: values.description,
      tags: processedTags,
      ...(values.knowledgeBaseType === 'DOCUMENT' && {
        responseType: values.responseType as 'BASIC' | 'MULTIMODAL',
      }),
      config,
    };

    try {
      await updateKnowledgeBase(validKnowledgeBaseId, paramsToSubmit);
      message.success('知识库更新成功');
      router.push('/knowledgebase');
      router.refresh();
    } catch {
      // 错误由拦截器统一处理
    } finally {
      setSubmitting(false);
    }
  };

  const stepItems = useMemo(
    () => [
      { title: '基础信息' },
      { title: '检索配置' },
      { title: '确认配置' },
    ],
    []
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <InfoStep
            form={form}
            availableTags={availableTags}
            selectedKnowledgeBaseType={selectedKnowledgeBaseType}
            selectedResponseType={selectedResponseType}
            disableKnowledgeBaseType
          />
        );
      case 1:
        return (
          <RetrievalStep
            form={form}
            selectedRetrievalMode={selectedRetrievalMode}
            topK={topK}
            embedMinScore={embedMinScore}
            topN={topN}
            rerankMinScore={rerankMinScore}
            denseWeight={denseWeight}
            sparseWeight={sparseWeight}
            onTopKChange={(val) => {
              setTopK(val);
              form.setFieldValue('topK', val);
            }}
            onEmbedMinScoreChange={(val) => {
              setEmbedMinScore(val);
              form.setFieldValue('embedMinScore', val);
            }}
            onTopNChange={(val) => {
              setTopN(val);
              form.setFieldValue('topN', val);
            }}
            onRerankMinScoreChange={(val) => {
              setRerankMinScore(val);
              form.setFieldValue('rerankMinScore', val);
            }}
            onDenseWeightChange={(val) => {
              setDenseWeight(val);
              form.setFieldValue('denseWeight', val);
            }}
            onSparseWeightChange={(val) => {
              setSparseWeight(val);
              form.setFieldValue('sparseWeight', val);
            }}
          />
        );
      case 2:
        const formValues = form.getFieldsValue(true);
        return <ConfirmStep values={formValues} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.stepHeader}>
        <div className={styles.stepHeaderInner}>
          <Steps
            current={currentStep}
            items={stepItems}
            size="small"
            style={{ maxWidth: 480, margin: '0 auto' }}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.bodyInner}>
          {!validKnowledgeBaseId && (
            <Alert
              type="error"
              showIcon
              message="无效的知识库 ID"
              description="请返回列表后重试。"
              style={{ marginBottom: 16 }}
            />
          )}

          <Spin spinning={initializing}>
            <div className={styles.formArea}>
              <Form form={form} layout="vertical">
                {renderStepContent()}
              </Form>
            </div>
          </Spin>
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionInner}>
          {currentStep > 0 && (
            <Button onClick={handlePrevious}>
              上一步
            </Button>
          )}
          {currentStep < 2 ? (
            <Button type="primary" onClick={handleNext} disabled={!validKnowledgeBaseId}>
              下一步
            </Button>
          ) : (
            <Button type="primary" loading={submitting} onClick={handleSubmit} disabled={!validKnowledgeBaseId}>
              保存配置
            </Button>
          )}
          <Button onClick={handleCancel}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditKnowledgeBasePage;
