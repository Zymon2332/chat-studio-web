"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Spin,
  Steps,
  message,
} from 'antd';
import { useRouter } from 'next/navigation';
import {
  createKnowledgeBase,
  getKnowledgeBaseTags,
  type CreateKnowledgeBaseParams,
  type TagItem,
} from '@/lib/api';
import InfoStep from './_components/InfoStep';
import RetrievalStep from './_components/RetrievalStep';
import ConfirmStep from './_components/ConfirmStep';
import styles from '../_styles/knowledgebase-wizard.module.css';

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

const NewKnowledgeBasePage: React.FC = () => {
  const router = useRouter();
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

        if (!mounted) return;

        setAvailableTags(tagsData);

        form.setFieldsValue({
          name: '',
          description: '',
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
  }, [form]);

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['name', 'description', 'tags', 'knowledgeBaseType', 'responseType']);
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
    // 确认页没有挂载 Form.Item，validateFields() 在该步骤会返回空对象；
    // 这里读取完整表单 store，确保前两步填写的数据不会丢失。
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

    const params: CreateKnowledgeBaseParams = {
      name: values.name,
      description: values.description,
      tags: processedTags,
      type: values.knowledgeBaseType as 'DOCUMENT' | 'VIDEO' | 'IMAGE',
      ...(values.knowledgeBaseType === 'DOCUMENT' && {
        responseType: values.responseType as 'BASIC' | 'MULTIMODAL',
      }),
      config,
    };

    try {
      await createKnowledgeBase(params);
      message.success('知识库创建成功');
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
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          ) : (
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              创建知识库
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

export default NewKnowledgeBasePage;
