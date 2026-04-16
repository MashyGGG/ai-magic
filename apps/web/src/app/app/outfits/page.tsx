'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Typography, Button, Table, Tag, Input, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  GENERATED: 'processing',
  REVIEWING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  ARCHIVED: 'default',
};

interface OutfitItem {
  id: string;
  title: string;
  status: string;
  providerPreference: string;
  imageModel: string;
  createdAt: string;
  characterTemplate: { id: string; name: string };
  _count: { generationJobs: number };
}

export default function OutfitsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['outfits', page, keyword],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.set('keyword', keyword);
      const res = await fetch(`/api/outfits?${params}`);
      return res.json();
    },
  });

  const columns: ColumnsType<OutfitItem> = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '角色模板',
      dataIndex: ['characterTemplate', 'name'],
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Provider',
      dataIndex: 'providerPreference',
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '任务数',
      dataIndex: ['_count', 'generationJobs'],
      width: 80,
      align: 'center',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, record: OutfitItem) => (
        <Button type="link" size="small" onClick={() => router.push(`/app/outfits/${record.id}`)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={3} style={{ margin: 0 }}>穿搭任务</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/app/outfits/new')}>
          新建任务
        </Button>
      </div>

      <div className="mb-4">
        <Space>
          <Input
            placeholder="搜索任务标题..."
            prefix={<SearchOutlined />}
            allowClear
            onPressEnter={(e) => { setKeyword((e.target as HTMLInputElement).value); setPage(1); }}
            onClear={() => { setKeyword(''); setPage(1); }}
            style={{ width: 280 }}
          />
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data?.items || []}
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.data?.total || 0,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />
    </div>
  );
}
