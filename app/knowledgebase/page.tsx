"use client";

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Tag, Space, Dropdown, Modal, message, Spin, Form, Select, Slider, Switch, Typography, theme, Empty, Row, Col, Avatar, Tooltip, Divider } from 'antd';
import { PlusOutlined, MoreOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DatabaseOutlined, CloudServerOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';
import { getKnowledgeBasePage, deleteKnowledgeBase, createKnowledgeBase, updateKnowledgeBase, getKnowledgeBaseInfo, getDictItems, getKnowledgeBaseTags, type KnowledgeBase, type CreateKnowledgeBaseParams, type DictItem, type TagItem } from '@/lib/api';

const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

const KnowledgeBasePage: React.FC = () => {
  const router = useRouter();
  const { token } = theme.useToken();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchValue, setSearchValue] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [retrievalModes, setRetrievalModes] = useState<DictItem[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingKnowledgeBase, setEditingKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [form] = Form.useForm();

  // 监听 rerankEnabled 字段变化，使用状态确保及时更新
  const [rerankEnabledState, setRerankEnabledState] = useState(false);
  const rerankEnabled = Form.useWatch('rerankEnabled', form);

  // 监听其他滑块字段
  const topKValue = Form.useWatch('topK', form);
  const embedMinScoreValue = Form.useWatch('embedMinScore', form);
  const topNValue = Form.useWatch('topN', form);
  const rerankMinScoreValue = Form.useWatch('rerankMinScore', form);

  // 同步 rerankEnabled 状态
  useEffect(() => {
    if (rerankEnabled !== undefined) {
      setRerankEnabledState(rerankEnabled);
    }
  }, [rerankEnabled]);

  // 获取知识库数据
  const fetchKnowledgeBases = async (isLoadMore = false) => {
    try {
      setLoading(true);
      
      const currentPageNum = isLoadMore ? currentPage + 1 : 1;
      
      const response = await getKnowledgeBasePage({
        pageNum: currentPageNum,
        pageSize,
        keyword: searchValue || undefined
      });

      
      // 检查是否返回了有效数据
      const hasValidData = response?.records && response.records.length > 0;
      
      let newKnowledgeBases;
      if (isLoadMore) {
        newKnowledgeBases = [...knowledgeBases, ...(response.records || [])];
        setKnowledgeBases(newKnowledgeBases);
        // 加载更多时，使用请求的页码更新状态
        setCurrentPage(currentPageNum);
      } else {
        newKnowledgeBases = response.records || [];
        setKnowledgeBases(newKnowledgeBases);
        // 首次加载时，重置为第1页
        setCurrentPage(1);
      }
      
      // 使用更新后的数据长度来判断是否还有更多数据
      const hasMoreData = hasValidData && newKnowledgeBases.length < response.total && response.total > 0;
      setHasMore(hasMoreData);
    } catch (error) {
      console.error('Failed to fetch knowledge bases:', error);
      // 如果是加载更多时出错，不要重置hasMore状态，允许用户重试
      if (!isLoadMore) {
        setHasMore(false);
        setKnowledgeBases([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取字典数据
  const fetchDictData = async () => {
    const [retrievalData, tagsData] = await Promise.all([
      getDictItems('retrieval_mode'),
      getKnowledgeBaseTags()
    ]);
    setRetrievalModes(retrievalData);
    setAvailableTags(tagsData);
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);
  
  // 搜索变化时重新获取数据
  useEffect(() => {
    fetchKnowledgeBases();
  }, [searchValue]);

  // 加载更多数据
  const loadMore = async () => {
    if (loading || !hasMore) {
      return;
    }
    
    await fetchKnowledgeBases(true);
  };

  // 搜索时重置数据
  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
    setHasMore(true);
  };

  // 菜单操作
  const handleMenuClick = (key: string, knowledgeBase: KnowledgeBase) => {
    switch (key) {
      case 'edit':
        handleEditKnowledgeBase(knowledgeBase.id);
        break;
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除知识库 "${knowledgeBase.name}" 吗？此操作不可撤销。`,
          okText: '确认',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              await deleteKnowledgeBase(knowledgeBase.id);
              message.success('知识库删除成功');
              fetchKnowledgeBases(); // 重新获取数据
            } catch {
              // 错误已由拦截器统一处理，此处只需阻止后续代码执行
            }
          },
        });
        break;
    }
  };

  const getMenuItems = (knowledgeBase: KnowledgeBase): MenuProps['items'] => [
    {
      key: 'edit',
      label: '修改配置',
      icon: <EditOutlined />,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleMenuClick('edit', knowledgeBase);
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除知识库',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        handleMenuClick('delete', knowledgeBase);
      },
    },
  ];

  // 添加知识库
  const handleAddKnowledgeBase = async () => {
    // 获取字典数据
    await fetchDictData();
    
    setIsEditMode(false);
    setEditingKnowledgeBase(null);
    setCreateModalVisible(true);
    form.resetFields();
    // 设置默认值
    form.setFieldsValue({
      topK: 5,
      embedMinScore: 0.5,
      rerankEnabled: false,
      topN: 5,
      rerankMinScore: 0.35,
      tags: []
    });
    setRerankEnabledState(false);
  };

  // 编辑知识库
  const handleEditKnowledgeBase = async (id: number) => {
    // 获取字典数据
    await fetchDictData();
    
    // 获取知识库详情
    const knowledgeBaseInfo = await getKnowledgeBaseInfo(id);

    setIsEditMode(true);
    setEditingKnowledgeBase(knowledgeBaseInfo);
    setCreateModalVisible(true);

    // 回显数据到表单
    const tagsForForm = knowledgeBaseInfo.tags?.map(tag => JSON.stringify(tag)) || [];

    // 构建表单数据，处理可能为空的字段
    const formData = {
      name: knowledgeBaseInfo.name,
      description: knowledgeBaseInfo.description || '',
      retrievalMode: knowledgeBaseInfo.retrievalMode,
      topK: knowledgeBaseInfo.topK || 5,
      embedMinScore: knowledgeBaseInfo.embedMinScore || 0.5,
      rerankEnabled: knowledgeBaseInfo.rerankEnabled || false,
      topN: knowledgeBaseInfo.topN || 5,
      rerankMinScore: knowledgeBaseInfo.rerankMinScore || 0.35,
      tags: tagsForForm
    };

    form.setFieldsValue(formData);
    setRerankEnabledState(knowledgeBaseInfo.rerankEnabled || false);
  };

  // 提交新增/编辑知识库
  const handleCreateSubmit = async () => {
    const values = await form.validateFields();
    setCreateLoading(true);
    
    // 处理标签数据格式
    const processedTags = values.tags?.map((tag: string) => {
      try {
        // 尝试解析为已有标签
        return JSON.parse(tag);
      } catch {
        // 如果解析失败，说明是新输入的标签
        return { name: tag };
      }
    }) || [];
    
    const params: CreateKnowledgeBaseParams = {
      name: values.name,
      description: values.description,
      retrievalMode: values.retrievalMode,
      topK: values.topK,
      rerankEnabled: values.rerankEnabled,
      embedMinScore: values.embedMinScore,
      topN: values.rerankEnabled ? values.topN : undefined,
      rerankMinScore: values.rerankEnabled ? values.rerankMinScore : undefined,
      tags: processedTags
    };
    
    try {
      if (isEditMode && editingKnowledgeBase) {
        await updateKnowledgeBase(editingKnowledgeBase.id, params);
        message.success('知识库更新成功');
      } else {
        await createKnowledgeBase(params);
        message.success('知识库创建成功');
      }
      
      setCreateModalVisible(false);
      form.resetFields();
      setIsEditMode(false);
      setEditingKnowledgeBase(null);
      setRerankEnabledState(false);
      fetchKnowledgeBases(); // 刷新列表
    } catch {
      // 错误已由拦截器统一处理
    } finally {
      setCreateLoading(false);
    }
  };

  // 取消新增
  const handleCreateCancel = () => {
    setCreateModalVisible(false);
    form.resetFields();
    setRerankEnabledState(false);
  };

  // 渲染顶部区域
  const renderHeader = () => (
    <div style={{ 
      padding: '24px 32px', 
      background: token.colorBgContainer,
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0
    }}>
      <div>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>知识库管理</Title>
        <Text type="secondary">统一管理您的文档知识，构建专属的 AI 知识引擎</Text>
      </div>
      <Space size="middle">
        <Input
          prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
          placeholder="搜索知识库..."
          allowClear
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 280, borderRadius: token.borderRadius }}
          size="middle"
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddKnowledgeBase}
          size="middle"
        >
          新建知识库
        </Button>
      </Space>
    </div>
  );

  // 渲染卡片网格
  const renderContent = () => (
    <div 
      style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '24px 32px',
        background: token.colorBgLayout
      }}
      onScroll={(e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
        
        if (isNearBottom && hasMore && !loading) {
          loadMore();
        }
      }}
    >
      <Spin spinning={loading && knowledgeBases.length === 0}>
        {knowledgeBases.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24,
            paddingBottom: 24
          }}>
            {knowledgeBases.map((kb) => (
              <Card
                key={kb.id}
                hoverable
                style={{ 
                  borderRadius: token.borderRadiusLG, 
                  border: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
                styles={{
                  body: {
                    padding: '16px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }
                }}
                onClick={() => router.push(`/documents?kbId=${kb.id}`)}
              >
                {/* 顶部区域 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Avatar 
                      shape="square" 
                      size={48} 
                      icon={<FileTextOutlined style={{ fontSize: 24 }} />} 
                      style={{ 
                        backgroundColor: token.colorPrimaryBg, 
                        color: token.colorPrimary,
                        borderRadius: token.borderRadiusLG
                      }} 
                    />
                    <div>
                      <Title level={5} style={{ margin: 0, marginBottom: 4, maxWidth: 180 }} ellipsis={{ tooltip: kb.name }}>
                        {kb.name}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ID: {kb.id}
                      </Text>
                    </div>
                  </div>
                  <Dropdown
                    menu={{ items: getMenuItems(kb) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button 
                      type="text" 
                      icon={<MoreOutlined />} 
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: token.colorTextTertiary }}
                    />
                  </Dropdown>
                </div>

                {/* 描述 */}
                <Paragraph 
                  type="secondary" 
                  style={{ 
                    fontSize: 14, 
                    marginBottom: 24, 
                    flex: 1,
                    minHeight: 44
                  }} 
                  ellipsis={{ rows: 2 }}
                >
                  {kb.description || '暂无描述信息'}
                </Paragraph>

                {/* 标签 */}
                <div style={{ marginBottom: 20, minHeight: 22 }}>
                  <Space size={[0, 8]} wrap>
                    {kb.tags && kb.tags.length > 0 ? (
                      kb.tags.slice(0, 3).map(tag => (
                        <Tag 
                          key={tag.id} 
                          bordered={false}
                          style={{ 
                            marginRight: 8,
                            backgroundColor: token.colorFillQuaternary,
                            color: token.colorTextSecondary,
                            borderRadius: 4
                          }}
                        >
                          {tag.name}
                        </Tag>
                      ))
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>无标签</Text>
                    )}
                  </Space>
                </div>

                {/* 底部统计 */}
                <div style={{ 
                  paddingTop: 16, 
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Space size="small">
                    <DatabaseOutlined style={{ color: token.colorTextTertiary }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {kb.docCount} 文档
                    </Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(kb.updatedTime).toLocaleDateString()}
                  </Text>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          !loading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '60vh' 
            }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space orientation="vertical" align="center">
                    <Text type="secondary">暂无知识库</Text>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddKnowledgeBase}>
                      创建第一个知识库
                    </Button>
                  </Space>
                }
              />
            </div>
          )
        )}

        {/* 加载更多提示 */}
        {hasMore && !loading && knowledgeBases.length > 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: token.colorTextTertiary }}>
            <Spin size="small" /> 加载更多...
          </div>
        )}
        
        {!hasMore && knowledgeBases.length > 0 && (
          <Divider plain style={{ color: token.colorTextQuaternary, fontSize: 12, margin: '24px 0' }}>
            已加载全部数据
          </Divider>
        )}
      </Spin>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: token.colorBgLayout }}>
      {renderHeader()}
      {renderContent()}

      {/* 新增/编辑知识库模态框 */}
      <Modal
        title={
          <Space>
            {isEditMode ? <EditOutlined style={{ color: token.colorPrimary }} /> : <AppstoreOutlined style={{ color: token.colorPrimary }} />}
            <span style={{ fontWeight: 600 }}>{isEditMode ? '编辑知识库' : '新建知识库'}</span>
          </Space>
        }
        open={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={handleCreateCancel}
        confirmLoading={createLoading}
        width={640}
        destroyOnHidden
        maskClosable={false}
        okText="保存"
        cancelText="取消"
        styles={{ body: { padding: '24px 0' } }}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          style={{ padding: '0 24px', maxHeight: '60vh', overflowY: 'auto' }}
        >
          <Row gutter={24}>
            <Col span={24}>
              <Title level={5} style={{ marginBottom: 16, fontSize: 14 }}>
                <Space>
                  <div style={{ width: 4, height: 14, background: token.colorPrimary, borderRadius: 2 }} />
                  基本信息
                </Space>
              </Title>
            </Col>
            <Col span={24}>
              <Form.Item
                label="知识库名称"
                name="name"
                rules={[
                  { required: true, message: '请输入知识库名称' },
                  { max: 50, message: '知识库名称不能超过50个字符' }
                ]}
              >
                <Input placeholder="给知识库起个名字，例如：产品文档" size="large" maxLength={50} showCount />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="知识库描述" name="description" rules={[{ max: 200, message: '描述不能超过200个字符' }]}>
                <Input.TextArea 
                  placeholder="简单描述知识库的内容和用途" 
                  rows={3} 
                  maxLength={200} 
                  showCount 
                  style={{ resize: 'none' }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="标签" name="tags">
                <Select
                  mode="tags"
                  placeholder="输入或选择标签"
                  tokenSeparators={[',', ' ']}
                  maxTagCount={5}
                  size="large"
                  options={availableTags.map(tag => ({
                    label: tag.name,
                    value: JSON.stringify({ id: tag.id, name: tag.name })
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0 24px 0' }} />

          <Row gutter={24}>
            <Col span={24}>
              <Title level={5} style={{ marginBottom: 16, fontSize: 14 }}>
                <Space>
                  <div style={{ width: 4, height: 14, background: token.colorSuccess, borderRadius: 2 }} />
                  检索配置
                </Space>
              </Title>
            </Col>
            
            <Col span={24}>
              <Form.Item
                label="检索模式"
                name="retrievalMode"
                rules={[{ required: true, message: '请选择检索模式' }]}
              >
                <Select placeholder="选择检索策略" size="large">
                  {retrievalModes.map(item => (
                    <Select.Option key={item.code} value={item.code}>{item.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label={<Space>TopK <Tooltip title="单次召回的最大文档片段数"><SearchOutlined style={{ color: token.colorTextTertiary }} /></Tooltip></Space>}
                name="topK"
                rules={[{ required: true, message: '请设置TopK值' }]}
              >
                <Slider
                  min={1}
                  max={20}
                  marks={{ 1: '1', 10: '10', 20: '20' }}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label={<Space>向量阈值 <Tooltip title="低于该相似度的文档将被过滤"><CloudServerOutlined style={{ color: token.colorTextTertiary }} /></Tooltip></Space>}
                name="embedMinScore"
                rules={[{ required: true, message: '请设置向量召回阈值' }]}
              >
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <div style={{ background: token.colorFillQuaternary, padding: 16, borderRadius: token.borderRadiusLG }}>
                <Form.Item
                  label="启用 Rerank 重排序"
                  name="rerankEnabled"
                  valuePropName="checked"
                  style={{ marginBottom: rerankEnabledState ? 24 : 0 }}
                >
                  <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                </Form.Item>

                {rerankEnabledState && (
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item
                        label="Rerank TopN"
                        name="topN"
                        rules={[{ required: true, message: '请设置Rerank数量' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Slider min={1} max={20} marks={{ 1: '1', 10: '10', 20: '20' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Rerank 阈值"
                        name="rerankMinScore"
                        style={{ marginBottom: 0 }}
                      >
                        <Slider min={0} max={1} step={0.01} marks={{ 0: '0', 0.5: '0.5', 1: '1' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeBasePage;
