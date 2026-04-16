"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Tag,
  Button,
  Input,
  App,
  Empty,
  Skeleton,
  Pagination,
  Modal,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  InboxOutlined,
  PictureOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusColors: Record<string, string> = {
  GENERATED: "processing",
  REVIEWING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "default",
};

interface AssetForReview {
  id: string;
  type: string;
  reviewStatus: string;
  storageKey?: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState("");
  const [previewAsset, setPreviewAsset] = useState<AssetForReview | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["review-assets", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        reviewStatus: "GENERATED",
      });
      const r = await fetch(`/api/assets?${params}`);
      return r.json();
    },
  });

  const reviewMut = useMutation({
    mutationFn: async ({
      assetId,
      status,
    }: {
      assetId: string;
      status: string;
    }) => {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, status, comment }),
      });
      return r.json();
    },
    onSuccess: (r) => {
      if (r.success) {
        message.success("审核完成");
        setComment("");
        setPreviewAsset(null);
        queryClient.invalidateQueries({ queryKey: ["review-assets"] });
      } else message.error(r.error?.message);
    },
  });

  const items: AssetForReview[] = data?.data?.items || [];
  const total = data?.data?.total || 0;

  return (
    <div>
      <Title level={3}>审核</Title>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Skeleton active />
          <Skeleton active />
        </div>
      ) : items.length === 0 ? (
        <Empty description="暂无待审核资产" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Card
                key={item.id}
                hoverable
                className="overflow-hidden"
                onClick={() => setPreviewAsset(item)}
                cover={
                  <div className="flex h-40 items-center justify-center bg-gray-100">
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
                  </div>
                }
              >
                <div className="flex items-center justify-between">
                  <Tag color={item.type === "IMAGE" ? "blue" : "purple"}>
                    {item.type}
                  </Tag>
                  <Tag color={statusColors[item.reviewStatus]}>
                    {item.reviewStatus}
                  </Tag>
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
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={!!previewAsset}
        title="审核资产"
        onCancel={() => setPreviewAsset(null)}
        width={640}
        footer={
          previewAsset ? (
            <div className="flex items-center justify-between">
              <TextArea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="审核备注(可选)"
                rows={2}
                className="mr-4 flex-1"
              />
              <div className="flex gap-2">
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() =>
                    reviewMut.mutate({
                      assetId: previewAsset.id,
                      status: "REJECTED",
                    })
                  }
                  loading={reviewMut.isPending}
                >
                  驳回
                </Button>
                <Button
                  icon={<InboxOutlined />}
                  onClick={() =>
                    reviewMut.mutate({
                      assetId: previewAsset.id,
                      status: "ARCHIVED",
                    })
                  }
                  loading={reviewMut.isPending}
                >
                  归档
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() =>
                    reviewMut.mutate({
                      assetId: previewAsset.id,
                      status: "APPROVED",
                    })
                  }
                  loading={reviewMut.isPending}
                >
                  通过
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {previewAsset && (
          <div className="flex items-center justify-center">
            {previewAsset.type === "IMAGE" ? (
              <img
                src={`/api/assets/${previewAsset.id}/url`}
                alt=""
                className="max-h-[60vh] rounded-lg"
              />
            ) : (
              <video
                src={`/api/assets/${previewAsset.id}/url`}
                controls
                className="max-h-[60vh] rounded-lg"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
