"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Select,
  DatePicker,
  Card,
  Tag,
  Pagination,
  Drawer,
  Descriptions,
  Skeleton,
  Empty,
  Button,
} from "antd";
import {
  PlayCircleOutlined,
  PictureOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  GENERATED: "processing",
  REVIEWING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "default",
};

interface AssetItem {
  id: string;
  type: string;
  mimeType?: string;
  reviewStatus: string;
  provider?: string;
  isSelectedFrame: boolean;
  createdAt: string;
  storageKey?: string;
  jobOutputRefs?: {
    id: string;
    outfitId: string;
    stage: string;
    model: string;
    promptText?: string;
    seed?: number;
  }[];
}

export default function AssetsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assets", page, typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("reviewStatus", statusFilter);
      return api.get(`/api/assets?${params}`).then((r) => r.data);
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["asset-detail", selectedAsset],
    queryFn: () => api.get(`/api/assets/${selectedAsset}`).then((r) => r.data),
    enabled: !!selectedAsset,
  });

  const items: AssetItem[] = data?.data?.items || [];
  const total = data?.data?.total || 0;

  return (
    <div>
      <Title level={3}>资产库</Title>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          placeholder="资产类型"
          allowClear
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
          options={[
            { value: "IMAGE", label: "图片" },
            { value: "VIDEO", label: "视频" },
          ]}
          style={{ width: 120 }}
        />
        <Select
          placeholder="审核状态"
          allowClear
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={[
            { value: "GENERATED", label: "已生成" },
            { value: "REVIEWING", label: "审核中" },
            { value: "APPROVED", label: "已通过" },
            { value: "REJECTED", label: "已驳回" },
          ]}
          style={{ width: 120 }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton.Image active style={{ width: "100%" }} />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty description="暂无资产" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Card
                key={item.id}
                hoverable
                className="overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => setSelectedAsset(item.id)}
                cover={
                  <div className="relative flex h-40 items-center justify-center bg-gray-100">
                    {item.type === "IMAGE" ? (
                      <img
                        src={`/api/assets/${item.id}/url`}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <PlayCircleOutlined
                        style={{ fontSize: 48, color: "#999" }}
                      />
                    )}
                    <div className="absolute left-2 top-2">
                      <Tag color={item.type === "IMAGE" ? "blue" : "purple"}>
                        {item.type === "IMAGE" ? (
                          <PictureOutlined />
                        ) : (
                          <PlayCircleOutlined />
                        )}{" "}
                        {item.type}
                      </Tag>
                    </div>
                    {item.isSelectedFrame && (
                      <div className="absolute right-2 top-2">
                        <Tag color="gold">首帧</Tag>
                      </div>
                    )}
                  </div>
                }
              >
                <div className="flex items-center justify-between">
                  <Tag color={statusColors[item.reviewStatus]}>
                    {item.reviewStatus}
                  </Tag>
                  <Text type="secondary" className="text-xs">
                    {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                  </Text>
                </div>
              </Card>
            ))}
          </div>
          {total > 20 && (
            <div className="mt-6 flex justify-end">
              <Pagination
                current={page}
                total={total}
                pageSize={20}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      <Drawer
        title="资产详情"
        open={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        size="large"
        forceRender
      >
        {detailLoading ? (
          <Skeleton active />
        ) : !detailData?.data ? (
          <Empty />
        ) : (
          <div className="space-y-4">
            {detailData.data.type === "IMAGE" ? (
              <img
                src={`/api/assets/${detailData.data.id}/url`}
                alt=""
                className="w-full rounded-lg"
              />
            ) : (
              <video
                src={`/api/assets/${detailData.data.id}/url`}
                controls
                className="w-full rounded-lg"
                preload="none"
              />
            )}

            <Descriptions
              column={1}
              size="small"
              bordered
              items={[
                { label: "类型", children: detailData.data.type },
                {
                  label: "状态",
                  children: (
                    <Tag color={statusColors[detailData.data.reviewStatus]}>
                      {detailData.data.reviewStatus}
                    </Tag>
                  ),
                },
                { label: "Provider", children: detailData.data.provider || "-" },
                {
                  label: "文件大小",
                  children: detailData.data.fileSize
                    ? `${(detailData.data.fileSize / 1024).toFixed(1)} KB`
                    : "-",
                },
                {
                  label: "创建时间",
                  children: new Date(detailData.data.createdAt).toLocaleString("zh-CN"),
                },
              ]}
            />

            {detailData.data.jobOutputRefs?.[0] && (
              <Card title="来源任务" size="small">
                <Descriptions
                  column={1}
                  size="small"
                  items={[
                    { label: "模型", children: detailData.data.jobOutputRefs[0].model },
                    detailData.data.jobOutputRefs[0].seed
                      ? { label: "Seed", children: detailData.data.jobOutputRefs[0].seed }
                      : null,
                    detailData.data.jobOutputRefs[0].promptText
                      ? {
                          label: "Prompt",
                          children: (
                            <div className="max-h-32 overflow-auto text-xs">
                              {detailData.data.jobOutputRefs[0].promptText}
                            </div>
                          ),
                        }
                      : null,
                  ].filter(Boolean) as { label: string; children: React.ReactNode }[]}
                />
              </Card>
            )}

            <Button
              icon={<DownloadOutlined />}
              block
              onClick={() =>
                window.open(`/api/assets/${detailData.data.id}/url`)
              }
            >
              下载
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
