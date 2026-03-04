"use client";

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Tag, Space, Dropdown, Modal, message, Spin, Typography, theme, Empty, Divider, Avatar } from 'antd';
import { PlusOutlined, MoreOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DatabaseOutlined, CalendarOutlined, TagOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useRouter } from 'next/navigation';
import { getKnowledgeBasePage, deleteKnowledgeBase, getKnowledgeBaseTags, type KnowledgeBase, type TagItem } from '@/lib/api';

const { Search } = Input;
const { Title, Text, Paragraph } = Typography;

const formatDateLabel = (value?: string | null): string => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleDateString();
};

const KnowledgeBasePage: React.FC = () => {
  const router = useRouter();
  const { token } = theme.useToken();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchValue, setSearchValue] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

  const [tagFilterDropdownOpen, setTagFilterDropdownOpen] = useState(false);
  const [tagFilterKeyword, setTagFilterKeyword] = useState('');

  const fetchKnowledgeBases = async (isLoadMore = false) => {
    try {
      setLoading(true);
      const currentPageNum = isLoadMore ? currentPage + 1 : 1;
      const response = await getKnowledgeBasePage({
        pageNum: currentPageNum,
        pageSize,
        keyword: searchValue || undefined,
      });

      const hasValidData = response?.records && response.records.length > 0;
      let newKnowledgeBases: KnowledgeBase[];
      if (isLoadMore) {
        newKnowledgeBases = [...knowledgeBases, ...(response.records || [])];
        setKnowledgeBases(newKnowledgeBases);
        setCurrentPage(currentPageNum);
      } else {
        newKnowledgeBases = response.records || [];
        setKnowledgeBases(newKnowledgeBases);
        setCurrentPage(1);
      }

      const hasMoreData = hasValidData && newKnowledgeBases.length < response.total && response.total > 0;
      setHasMore(hasMoreData);
    } catch (error) {
      console.error('Failed to fetch knowledge bases:', error);
      if (!isLoadMore) {
        setHasMore(false);
        setKnowledgeBases([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [searchValue]);

  const loadMore = async () => {
    if (loading || !hasMore) {
      return;
    }
    await fetchKnowledgeBases(true);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
    setHasMore(true);
  };

  const handleTagFilterDropdownOpenChange = async (open: boolean) => {
    setTagFilterDropdownOpen(open);
    if (open && availableTags.length === 0) {
      try {
        const tags = await getKnowledgeBaseTags();
        setAvailableTags(tags);
      } catch {
        // 标签筛选仅为 UI 预留，失败时保持空状态
      }
    }
  };

  const handleMenuClick = (key: string, knowledgeBase: KnowledgeBase) => {
    switch (key) {
      case 'edit':
        router.push(`/knowledgebase/${knowledgeBase.id}/edit`);
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
              fetchKnowledgeBases();
            } catch {
              // 错误已由拦截器统一处理
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

  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagFilterKeyword.trim().toLowerCase())
  );

  const renderHeader = () => (
    <div
      style={{
        padding: '16px 32px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <Space size="middle" style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
        <Dropdown
          open={tagFilterDropdownOpen}
          onOpenChange={handleTagFilterDropdownOpenChange}
          trigger={['click']}
          placement="bottomLeft"
          popupRender={() => (
            <div
              style={{
                width: 320,
                borderRadius: 14,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: token.boxShadowSecondary,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <Input
                  prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
                  placeholder="搜索标签（UI 预留）"
                  value={tagFilterKeyword}
                  onChange={(e) => setTagFilterKeyword(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div
                style={{
                  height: 220,
                  overflowY: 'auto',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: filteredTags.length === 0 ? 'center' : 'flex-start',
                  justifyContent: filteredTags.length === 0 ? 'center' : 'flex-start',
                }}
              >
                {filteredTags.length > 0 ? (
                  <Space size={[8, 8]} wrap>
                    {filteredTags.map((tag) => (
                      <Tag key={tag.id} bordered={false} style={{ borderRadius: 6, paddingInline: 10 }}>
                        {tag.name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Space direction="vertical" align="center" size={6}>
                    <TagOutlined style={{ fontSize: 28, color: token.colorTextTertiary }} />
                    <Text type="secondary">没有标签</Text>
                  </Space>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, padding: '10px 14px' }}>
                <Button type="text" icon={<TagOutlined />} block style={{ justifyContent: 'flex-start' }}>
                  管理标签
                </Button>
              </div>
            </div>
          )}
        >
          <Button icon={<TagOutlined />}>
            <Space size={8}>
              <span>全部标签</span>
              <DownOutlined style={{ fontSize: 12 }} />
            </Space>
          </Button>
        </Dropdown>

        <Search
          prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
          placeholder="搜索知识库..."
          allowClear
          value={searchValue}
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 280, borderRadius: token.borderRadius }}
        />

        <Button type="default" icon={<PlusOutlined />} onClick={() => router.push('/knowledgebase/new')}>
          新建知识库
        </Button>
      </Space>
    </div>
  );

  const renderContent = () => (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '16px 24px',
        background: token.colorBgLayout,
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
              paddingBottom: 16,
            }}
          >
            {knowledgeBases.map((kb) => {
              return (
                <Card
                  key={kb.id}
                  hoverable
                  style={{
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                  styles={{
                    body: {
                      padding: '12px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    },
                  }}
                  onClick={() => router.push(`/documents?kbId=${kb.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 10, minWidth: 0, flex: 1 }}>
                      <Avatar
                        shape="square"
                        size={36}
                        icon={<FileTextOutlined style={{ fontSize: 16 }} />}
                        style={{
                          backgroundColor: token.colorPrimaryBg,
                          color: token.colorPrimary,
                          borderRadius: token.borderRadius,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <Title level={5} style={{ margin: 0, marginBottom: 4, fontSize: 14 }} ellipsis={{ tooltip: kb.name }}>
                          {kb.name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          更新于 {formatDateLabel(kb.updatedTime)}
                        </Text>
                      </div>
                    </div>

                    <Dropdown menu={{ items: getMenuItems(kb) }} trigger={['click']} placement="bottomRight">
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: token.colorTextTertiary }}
                      />
                    </Dropdown>
                  </div>

                  <div style={{ marginBottom: 14, minHeight: 36, flex: 1 }}>
                    {kb.description ? (
                      <Paragraph
                        type="secondary"
                        style={{
                          fontSize: 13,
                          margin: 0,
                          minHeight: 36,
                        }}
                        ellipsis={{ rows: 2 }}
                      >
                        {kb.description}
                      </Paragraph>
                    ) : null}
                  </div>

                  <div style={{ marginBottom: 10, minHeight: 24 }}>
                    {kb.tags && kb.tags.length > 0 ? (
                      <Space size={[0, 8]} wrap>
                        {kb.tags.slice(0, 3).map((tag) => (
                          <Tag
                            key={tag.id}
                            bordered={false}
                            style={{
                              marginRight: 6,
                              backgroundColor: token.colorFillQuaternary,
                              color: token.colorTextSecondary,
                              borderRadius: 6,
                            }}
                          >
                            {tag.name}
                          </Tag>
                        ))}
                        {kb.tags.length > 3 && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            +{kb.tags.length - 3}
                          </Text>
                        )}
                      </Space>
                    ) : null}
                  </div>

                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Space size="small">
                      <DatabaseOutlined style={{ color: token.colorTextTertiary }} />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {kb.docCount} 文档
                      </Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      创建于 {formatDateLabel(kb.createdTime)}
                    </Text>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center">
                    <Text type="secondary">暂无知识库</Text>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/knowledgebase/new')}>
                      创建第一个知识库
                    </Button>
                  </Space>
                }
              />
            </div>
          )
        )}

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
      <div style={{ flex: 1, minHeight: 0 }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default KnowledgeBasePage;
