"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { theme, Typography, Space, Tag, Button, App, Empty, Drawer, Form, Input, Pagination, Spin, Switch, Tooltip, Card } from 'antd';
import { DocumentChunk, getDocumentChunkPage, updateDocumentChunk, updateChunkContent } from '@/lib/api/documents';
import { ArrowLeftOutlined, EditOutlined, KeyOutlined, FileTextOutlined, NumberOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useSearchParams, useRouter } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;

const DocumentChunksContent: React.FC = () => {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = searchParams.get('docId');
  const { token } = theme.useToken();
  
  const [loading, setLoading] = useState(false);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [chunkPagination, setChunkPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  const [isContentEditing, setIsContentEditing] = useState(false);
  const editAreaRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Drawer related state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isHoveringDrawerContent, setIsHoveringDrawerContent] = useState(false);
  const drawerContentRef = useRef<HTMLDivElement>(null);
  const drawerFooterRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef('');

  const handleOpenDrawer = (chunk: DocumentChunk) => {
    setSelectedChunk(chunk);
    setEditContent(chunk.content);
    lastSavedContentRef.current = chunk.content;
    setDrawerVisible(true);
    setIsDrawerEditing(false);
  };

  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedChunk(null);
    setIsDrawerEditing(false);
    setIsHoveringDrawerContent(false);
  };

  const handleStartEdit = () => {
    if (selectedChunk) {
      setEditContent(selectedChunk.content);
      setIsDrawerEditing(true);
    }
  };

  const handleCancelEdit = () => {
    // If currently editing, cancel edit mode and revert content
    if (isDrawerEditing) {
      setIsDrawerEditing(false);
      if (selectedChunk) {
        setEditContent(selectedChunk.content);
      }
    } else {
      // If not editing (read-only), close the drawer
      handleCloseDrawer();
    }
  };

  const handleSaveEdit = async () => {
    // If not editing, switch to edit mode
    if (!isDrawerEditing) {
      handleStartEdit();
      return;
    }

    if (!selectedChunk || !docId) return;

    // If content hasn't changed compared to last saved, just exit edit mode
    if (editContent === lastSavedContentRef.current) {
      setIsDrawerEditing(false);
      return;
    }

    try {
      await updateChunkContent({
        docId: docId,
        chunkId: selectedChunk.chunkId,
        content: editContent
      });

      // Only update the list and local state after success
      const newChunks = chunks.map(c => 
        c.chunkId === selectedChunk.chunkId ? { ...c, content: editContent } : c
      );
      setChunks(newChunks);
      
      // Update selected chunk locally with the new content
      setSelectedChunk({ ...selectedChunk, content: editContent });

      message.success('更新分块内容成功');
      setIsDrawerEditing(false);
      lastSavedContentRef.current = editContent;
    } finally {
      setIsDrawerEditing(false);
    }
  };

  const handleSyncEditLocally = () => {
    if (selectedChunk && editContent !== selectedChunk.content) {
      // Update local state only (for preview in drawer)
      // We DO NOT update the main list (chunks) here, so changes are not reflected outside
      // until explicitly saved.
      const newChunk = { ...selectedChunk, content: editContent };
      setSelectedChunk(newChunk);
      
      // Exit edit mode without API call
      setIsDrawerEditing(false);
    } else {
      handleCancelEdit();
    }
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (isDrawerEditing && 
          drawerContentRef.current && !drawerContentRef.current.contains(e.target as Node) &&
          drawerFooterRef.current && !drawerFooterRef.current.contains(e.target as Node)) {
        
        handleSyncEditLocally();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isDrawerEditing, handleSyncEditLocally]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isContentEditing && 
          editAreaRef.current && !editAreaRef.current.contains(target) &&
          footerRef.current && !footerRef.current.contains(target)) {
        setIsContentEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isContentEditing]);

  useEffect(() => {
    if (docId) {
      fetchDocumentChunks(docId, 1, 10);
    }
  }, [docId]);

  const fetchDocumentChunks = async (targetDocId: string, pageNum: number, pageSize: number) => {
    if (!targetDocId) return;
    
    setLoading(true);
    try {
      const response = await getDocumentChunkPage({
        docId: targetDocId,
        pageNum,
        pageSize
      });
      setChunks(response.records);
      setChunkPagination({
        current: response.current,
        pageSize: response.size,
        total: response.total
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChunkPageChange = (page: number, pageSize?: number) => {
    if (docId) {
      fetchDocumentChunks(docId, page, pageSize || chunkPagination.pageSize);
    }
  };

  const toggleExpand = (chunkId: string) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId);
    } else {
      newExpanded.add(chunkId);
    }
    setExpandedChunks(newExpanded);
  };

  const handleSwitchChange = async (chunk: DocumentChunk, checked: boolean) => {
    try {
      // Optimistic update
      const newChunks = chunks.map(c => 
        c.chunkId === chunk.chunkId ? { ...c, enabled: checked } : c
      );
      setChunks(newChunks);

      await updateDocumentChunk({
        chunkId: chunk.chunkId,
        enabled: checked
      });
      message.success(checked ? '启用分块成功' : '禁用分块成功');
    } catch (error) {
      // Revert on failure
      const revertedChunks = chunks.map(c => 
        c.chunkId === chunk.chunkId ? { ...c, enabled: !checked } : c
      );
      setChunks(revertedChunks);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!docId) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: token.colorBgContainer 
      }}>
        <Empty description="缺少文档ID参数">
          <Button type="primary" onClick={handleBack}>返回</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      background: token.colorBgLayout, 
      color: token.colorText, 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* 头部 */}
      <div style={{ 
        padding: '20px 32px', 
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack} 
            style={{ marginRight: 12, fontSize: 16 }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>文档切片</Title>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>查看文档的分块详情</Text>
          </div>
        </div>
        <Space>
           <Tag color="processing" style={{ margin: 0, padding: '4px 12px', fontSize: 14 }}>
             共 {chunkPagination.total} 个分块
           </Tag>
        </Space>
      </div>

      {/* 列表区域 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          minHeight: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}>
          <div style={{ flex: 1 }}>
            <Spin spinning={loading}>
              <div style={{ minHeight: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chunks.map((item) => (
                <Card
                  key={item.chunkId}
                  hoverable
                  bordered={false}
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  bodyStyle={{ padding: '20px 24px' }}
                  onMouseEnter={(e) => {
                    const actions = e.currentTarget.querySelector('.chunk-actions') as HTMLElement;
                    if (actions) actions.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const actions = e.currentTarget.querySelector('.chunk-actions') as HTMLElement;
                    if (actions) actions.style.opacity = '0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Tag color="blue" style={{ margin: 0, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <NumberOutlined /> {item.chunkIndex + 1}
                      </Tag>
                      
                      <div style={{ width: 1, height: 14, background: token.colorBorderSecondary }} />
                      
                      <Tooltip title={`ID: ${item.chunkId}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: token.colorTextSecondary, fontSize: 13, cursor: 'pointer' }}>
                          <KeyOutlined style={{ fontSize: 12 }} />
                          <span style={{ 
                            maxWidth: 120, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace'
                          }}>
                            {item.chunkId}
                          </span>
                        </div>
                      </Tooltip>

                      <div style={{ width: 1, height: 14, background: token.colorBorderSecondary }} />

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: token.colorTextSecondary, fontSize: 13 }}>
                        <FileTextOutlined style={{ fontSize: 12 }} />
                        <span>{item.content.length} 字符</span>
                      </div>
                    </div>
                    
                    <div 
                      className="chunk-actions" 
                      style={{ 
                        display: 'flex', 
                        gap: 12, 
                        opacity: 0, 
                        transition: 'all 0.2s',
                        alignItems: 'center',
                        background: token.colorBgContainer,
                        paddingLeft: 12
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={expandedChunks.has(item.chunkId) ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => toggleExpand(item.chunkId)}
                        style={{ color: token.colorTextSecondary }}
                      >
                        {expandedChunks.has(item.chunkId) ? "收起" : "展开"}
                      </Button>
                      
                      <Button 
                        type="primary" 
                        ghost
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenDrawer(item)}
                      >
                        编辑
                      </Button>
                      
                      <Tooltip title={item.enabled !== false ? "已启用" : "已禁用"}>
                        <Switch 
                          size="small" 
                          checked={item.enabled !== false} 
                          onChange={(checked) => handleSwitchChange(item, checked)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                  
                  <div 
                    style={{ 
                      background: token.colorFillQuaternary,
                      padding: '16px 20px',
                      borderRadius: 8,
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: token.colorText,
                      fontFamily: "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                  >
                    {expandedChunks.has(item.chunkId) ? (
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {item.content}
                      </div>
                    ) : (
                      <Paragraph 
                        ellipsis={{ rows: 3, expandable: false }}
                        style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {item.content}
                      </Paragraph>
                    )}
                  </div>
                </Card>
              ))}
              
              {chunks.length === 0 && !loading && (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="暂无分块数据" 
                  style={{ 
                    background: token.colorBgContainer, 
                    padding: 40, 
                    borderRadius: 12,
                    margin: 0
                  }} 
                />
              )}
            </div>
            </Spin>
          </div>

          <div style={{ 
            textAlign: 'right', 
            background: token.colorBgContainer,
            padding: '16px 24px',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <Pagination
              current={chunkPagination.current}
              pageSize={chunkPagination.pageSize}
              total={chunkPagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
              onChange={handleChunkPageChange}
              onShowSizeChange={handleChunkPageChange}
            />
          </div>
        </div>
      </div>
      
      <Drawer
        title="编辑切片"
        placement="right"
        width={600}
        onClose={handleCloseDrawer}
        open={drawerVisible}
        maskClosable={true}
        footer={
          <div ref={drawerFooterRef} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCancelEdit}>取消</Button>
            <Button type="primary" onClick={handleSaveEdit}>保存</Button>
          </div>
        }
      >
        {selectedChunk && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">分块ID: {selectedChunk.chunkId}</Text>
              <Text type="secondary">{selectedChunk.content.length} 字符</Text>
            </div>
            
            <div 
              ref={drawerContentRef}
              style={{ 
                position: 'relative',
                flex: 1,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                background: token.colorFillQuaternary,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden', // Ensure content doesn't spill out
              }}
              onMouseEnter={() => setIsHoveringDrawerContent(true)}
              onMouseLeave={() => setIsHoveringDrawerContent(false)}
            >
              {!isDrawerEditing ? (
                <>
                  <div style={{ 
                    padding: 16,
                    height: '100%',
                    overflowY: 'auto'
                  }}>
                    <Paragraph 
                      style={{ 
                        margin: 0,
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word',
                        fontSize: 13,
                        lineHeight: 1.6,
                        minHeight: '100%',
                        color: token.colorText
                      }}
                    >
                      {selectedChunk.content}
                    </Paragraph>
                  </div>
                  {isHoveringDrawerContent && (
                    <Button
                      type="text"
                      size="small"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: token.colorBgContainer,
                        boxShadow: token.boxShadowSecondary,
                        zIndex: 1,
                        fontSize: 12
                      }}
                      onClick={handleStartEdit}
                    >
                      编辑
                    </Button>
                  )}
                </>
              ) : (
                <Input.TextArea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                  variant='borderless'
                  style={{
                    height: '100%',
                    resize: 'none',
                    fontSize: 16,
                    lineHeight: 1.6,
                    padding: 16,
                    background: 'transparent'
                  }}
                />
              )}
            </div>
            
          </div>
        )}
      </Drawer>
    </div>
  );
};

const DocumentChunksPage: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <Suspense fallback={
      <div style={{ 
        height: '100%', 
        width: '100%', 
        background: token.colorBgContainer, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <Empty description="加载中..." />
      </div>
    }>
      <DocumentChunksContent />
    </Suspense>
  );
};

export default DocumentChunksPage;
