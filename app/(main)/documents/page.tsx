"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Table, Button, Input, Tag, Space, App, Tooltip, theme, Typography, Empty } from 'antd';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  FileTextOutlined, 
  ExclamationCircleOutlined, 
  ReloadOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDocumentPage, deleteDocument, type Document } from '@/lib/api';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import DocumentDetailModal from '@/components/DocumentDetailModal';

const { Title, Text } = Typography;

const DocumentsPageContent: React.FC = () => {
  const { message, modal } = App.useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const kbId = searchParams.get('kbId');
  const { token } = theme.useToken();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // 获取文档数据
  const fetchDocuments = async (pageNum = 1, keyword = '') => {
    if (!kbId) {
      message.error('缺少知识库ID参数');
      return;
    }

    try {
      setLoading(true);
      const response = await getDocumentPage({
        kbId,
        pageNum,
        pageSize,
        keyword: keyword || undefined
      });

      // 正常处理响应数据，包括空数据情况
      setDocuments(response?.records || []);
      setTotal(response?.total || 0);
      setCurrentPage(response?.current || pageNum);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      // 只在真正的网络错误或服务器错误时显示错误消息
      // 数据为空不算错误，不显示错误提示
      setDocuments([]);
      setTotal(0);
      setCurrentPage(pageNum);
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchDocuments(1, searchValue);
  }, [kbId]);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchValue(value);
    fetchDocuments(1, value);
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchDocuments(page, searchValue);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  // 获取状态标签
  const getStatusTag = (status: string, error?: string | null) => {
    const statusConfig = {
      QUEUE: { color: 'blue', text: '队列中' },
      PROCESSING: { color: 'orange', text: '处理中' },
      COMPLETED: { color: 'green', text: '已完成' },
      FAILED: { color: 'red', text: '失败' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    
    if (status === 'FAILED' && error) {
      return (
        <Tooltip title={error}>
          <Tag color={config.color} style={{ cursor: 'pointer' }}>
            {config.text}
          </Tag>
        </Tooltip>
      );
    }

    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 删除文档
  const handleDelete = (doc: Document) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: `确定要删除文档 "${doc.title}" 吗？此操作不可撤销。`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDocument(doc.docId);
          message.success('文档删除成功');
          fetchDocuments(currentPage, searchValue);
        } catch {
          // 错误已由拦截器统一处理
        }
      },
    });
  };

  // 返回知识库
  const handleBack = () => {
    router.push('/knowledgebase');
  };

  // 处理查看详情
  const handleViewDetail = (record: Document) => {
    setSelectedDocId(record.docId);
    setDetailModalVisible(true);
  };

  // 处理查看切片
  const handleViewChunks = (record: Document) => {
    router.push(`/documents/chunks?docId=${record.docId}`);
  };

  if (!kbId) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: token.colorBgContainer 
      }}>
        <Empty
          description={
            <Space orientation="vertical" align="center">
              <Text>缺少知识库ID参数</Text>
              <Button type="primary" onClick={handleBack}>返回知识库</Button>
            </Space>
          }
        />
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
            <Title level={4} style={{ margin: 0, marginBottom: 2 }}>文档管理</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>统一管理知识库中的文档资源</Text>
          </div>
        </div>
        <Space size="middle">
          <Input
            prefix={<SearchOutlined style={{ color: token.colorTextPlaceholder }} />}
            placeholder="搜索文档..."
            allowClear
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 260, borderRadius: token.borderRadius }}
          />
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => fetchDocuments(currentPage, searchValue)}
          >
            刷新
          </Button>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文档
          </Button>
        </Space>
      </div>

      {/* 文档列表 */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'hidden', // 让 Table 自己处理滚动
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          background: token.colorBgContainer, 
          padding: 24, 
          borderRadius: token.borderRadiusLG,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden', // 确保内容不溢出圆角
          boxShadow: token.boxShadowTertiary
        }}>
          <Table
            dataSource={documents}
            loading={loading}
            rowKey="docId"
            scroll={{ y: 'calc(100vh - 380px)' }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              onChange: handlePageChange,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              style: { marginTop: 16, marginBottom: 0 },
              hideOnSinglePage: false
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space orientation="vertical" size="small">
                      <Text type="secondary">暂无文档</Text>
                      <Button type="link" onClick={() => setUploadModalVisible(true)}>
                        上传第一个文档
                      </Button>
                    </Space>
                  }
                />
              )
            }}
            columns={[
              {
                title: '文档名称',
                dataIndex: 'title',
                key: 'title',
                width: 280,
                ellipsis: true,
                render: (title: string, record: Document) => (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      background: token.colorPrimaryBg, 
                      borderRadius: token.borderRadiusSM,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      flexShrink: 0
                    }}>
                      <FileTextOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <Text strong ellipsis style={{ display: 'block', maxWidth: '100%' }}>{title}</Text>
                      <Tag variant='outlined' style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                        {record.sourceType.toUpperCase()}
                      </Tag>
                    </div>
                  </div>
                )
              },
              {
                 title: '处理状态',
                 dataIndex: 'status',
                 key: 'status',
                 width: 120,
                 render: (status: string, record: Document) => (
                   getStatusTag(status, record.error)
                 )
               },
               {
                 title: '标签',
                 dataIndex: 'tags',
                 key: 'tags',
                 width: 200,
                 ellipsis: true,
                 render: (tags: string[]) => (
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                     {tags.length > 0 ? (
                       tags.map((tag, index) => (
                          <Tag key={index} bordered={false} style={{ background: token.colorFillQuaternary }}>{tag}</Tag>
                        ))
                     ) : (
                       <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
                     )}
                   </div>
                 )
               },
               {
                 title: '分块数',
                 dataIndex: 'chunkSize',
                 key: 'chunkSize',
                 width: 100,
                 align: 'center'
               },
               {
                 title: 'Token用量',
                 dataIndex: 'totalTokenCount',
                 key: 'totalTokenCount',
                 width: 120,
                 align: 'center',
                 render: (totalTokenCount: number | null) => (
                   totalTokenCount !== null ? totalTokenCount.toLocaleString() : '-'
                 )
               },
               {
                 title: '文件大小',
                 dataIndex: 'size',
                 key: 'size',
                 width: 110,
                 render: (size: number) => formatFileSize(size)
               },
               {
                 title: '上传时间',
                 dataIndex: 'uploadTime',
                 key: 'uploadTime',
                 width: 180,
                 render: (time: string) => (
                    <Text type="secondary">{formatTime(time)}</Text>
                 )
              },
              
               {
                 title: '操作',
                 key: 'action',
                 width: 200,
                 fixed: 'right',
                 render: (_, record: Document) => (
                   <Space separator={<span style={{ color: token.colorBorderSecondary }}>|</span>}>
                     {record.status === 'COMPLETED' ? (
                       <Typography.Link
                         onClick={() => handleViewChunks(record)}
                       >
                         <Space size={4}>
                           <AppstoreOutlined />
                           切片
                         </Space>
                       </Typography.Link>
                     ) : (
                        <Text disabled>
                          <Space size={4}>
                            <AppstoreOutlined />
                            切片
                          </Space>
                        </Text>
                     )}
                     {record.status === 'COMPLETED' ? (
                       <Typography.Link
                         onClick={() => handleViewDetail(record)}
                       >
                         <Space size={4}>
                           <EyeOutlined />
                           详情
                         </Space>
                       </Typography.Link>
                     ) : (
                        <Text disabled>
                          <Space size={4}>
                            <EyeOutlined />
                            详情
                          </Space>
                        </Text>
                     )}
                     {(record.status === 'COMPLETED' || record.status === 'FAILED') ? (
                       <Typography.Link
                         type="danger"
                         onClick={() => handleDelete(record)}
                       >
                         <Space size={4}>
                           <DeleteOutlined />
                           删除
                         </Space>
                       </Typography.Link>
                     ) : (
                        <Text disabled>
                          <Space size={4}>
                            <DeleteOutlined />
                            删除
                          </Space>
                        </Text>
                     )}
                   </Space>
                 )
               }
            ]}
          />
        </div>
      </div>

      {/* 上传文档模态框 */}
      <DocumentUploadModal
        visible={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        onSuccess={() => {
          setUploadModalVisible(false);
          fetchDocuments(currentPage, searchValue);
        }}
        kbId={kbId || ''}
      />

      {/* 文档详情模态框 */}
      <DocumentDetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedDocId(null);
        }}
        docId={selectedDocId}
      />
    </div>
  );
};

const DocumentsPage: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <App>
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
        <DocumentsPageContent />
      </Suspense>
    </App>
  );
};

export default DocumentsPage;
