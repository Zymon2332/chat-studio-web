'use client';

import React from 'react';
import { Form, Input, Select } from 'antd';
import { DatabaseOutlined, FileTextOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { TagItem } from '@/lib/api';
import styles from '../../_styles/knowledgebase-wizard.module.css';

interface OptionItem {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

const knowledgeBaseTypeOptions: OptionItem[] = [
  {
    label: '文档检索',
    value: 'DOCUMENT',
    description: '构建文本、文档、文件知识库，适合通用知识问答场景。',
    icon: <FileTextOutlined />,
  },
  {
    label: '视频检索',
    value: 'VIDEO',
    description: '构建视频内容检索知识库，支持视频语义理解与问答。',
    icon: <VideoCameraOutlined />,
  },
  {
    label: '图片检索',
    value: 'IMAGE',
    description: '构建图片内容检索知识库，支持图像语义解析与提问。',
    icon: <PictureOutlined />,
  },
];

const responseTypeOptions: OptionItem[] = [
  {
    label: '基础响应',
    value: 'BASIC',
    description: '基于检索文本片段进行标准问答响应。',
    icon: <DatabaseOutlined />,
  },
  {
    label: '多模态响应',
    value: 'MULTIMODAL',
    description: '结合图文信息进行更丰富的多模态内容回复。',
    icon: <DatabaseOutlined />,
  },
];

interface InfoStepProps {
  form: any;
  availableTags: TagItem[];
  selectedKnowledgeBaseType?: string;
  selectedResponseType?: string;
  disableKnowledgeBaseType?: boolean;
}

const InfoStep: React.FC<InfoStepProps> = ({
  form,
  availableTags,
  selectedKnowledgeBaseType,
  selectedResponseType,
  disableKnowledgeBaseType = false,
}) => {
  const renderOptionGrid = (
    title: string,
    field: 'knowledgeBaseType' | 'responseType',
    selectedValue: string | undefined,
    options: OptionItem[],
    disabled = false
  ) => (
    <div style={{ marginBottom: 24 }}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.optionGrid}>
        {options.map((option) => {
          const active = selectedValue === option.value;
          return (
            <div
              key={option.value}
              className={`${styles.optionItem} ${active ? styles.optionItemActive : ''}`}
              onClick={() => {
                if (!disabled) {
                  form.setFieldValue(field, option.value);
                }
              }}
              style={disabled ? { cursor: 'not-allowed', opacity: 0.65 } : undefined}
            >
              <span className={`${styles.optionRadio} ${active ? styles.optionRadioActive : ''}`} />
              <div className={styles.optionLabelRow}>
                <span>{option.icon}</span>
                <span className={styles.optionTitle}>{option.label}</span>
              </div>
              <div className={styles.optionDesc}>{option.description}</div>
            </div>
          );
        })}
      </div>
      <Form.Item shouldUpdate noStyle>
        {() => {
          const errors = form.getFieldError(field);
          return errors.length > 0 ? <div className={styles.errorText}>{errors[0]}</div> : null;
        }}
      </Form.Item>
    </div>
  );

  return (
    <>
      <Form.Item
        label="知识库名称"
        name="name"
        rules={[
          { required: true, message: '请输入知识库名称' },
          { max: 50, message: '知识库名称不能超过50个字符' },
        ]}
      >
        <Input placeholder="请输入知识库名称" maxLength={50} showCount />
      </Form.Item>

      <Form.Item
        label="知识库描述"
        name="description"
        rules={[{ max: 200, message: '描述不能超过200个字符' }]}
      >
        <Input.TextArea
          placeholder="请输入知识库描述，介绍知识库中包含的内容"
          rows={3}
          maxLength={200}
          showCount
        />
      </Form.Item>

      <Form.Item label="标签" name="tags">
        <Select
          mode="tags"
          placeholder="输入或选择标签"
          tokenSeparators={[',', ' ']}
          options={availableTags.map((tag) => ({
            label: tag.name,
            value: JSON.stringify({ id: tag.id, name: tag.name }),
          }))}
        />
      </Form.Item>

      <Form.Item name="knowledgeBaseType" rules={[{ required: true }]} style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      {renderOptionGrid('知识库类型', 'knowledgeBaseType', selectedKnowledgeBaseType, knowledgeBaseTypeOptions, disableKnowledgeBaseType)}

      {selectedKnowledgeBaseType === 'DOCUMENT' && (
        <>
          <Form.Item name="responseType" rules={[{ required: true }]} style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          {renderOptionGrid('检索响应', 'responseType', selectedResponseType, responseTypeOptions)}
        </>
      )}
    </>
  );
};

export default InfoStep;
