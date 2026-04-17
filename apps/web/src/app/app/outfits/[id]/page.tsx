"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Descriptions,
  Tag,
  Skeleton,
  Empty,
  Statistic,
  Timeline,
  Row,
  Col,
  Button,
  App,
} from "antd";
import {
  ClockCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "default",
  GENERATED: "processing",
  REVIEWING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "default",
  PENDING: "default",
  QUEUED: "processing",
  RUNNING: "processing",
  SUCCEEDED: "success",
  FAILED: "error",
  CANCELED: "default",
  DOWNLOAD_FAILED: "error",
  BUDGET_EXCEEDED: "warning",
  RETRYING: "processing",
};

interface JobItem {
  id: string;
  stage: string;
  status: string;
  model: string;
  candidateIndex: number;
  seed?: number;
  createdAt: string;
  finishedAt?: string;
  errorMessage?: string;
  outputAsset?: {
    id: string;
    storageKey: string;
    type: string;
    isSelectedFrame: boolean;
    reviewStatus: string;
  };
  costs: { amount: string }[];
}

export default function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["outfit", id],
    queryFn: () => api.get(`/api/outfits/${id}`).then((r) => r.data),
    refetchInterval: 5000,
  });

  const genImagesMut = useMutation({
    mutationFn: () => {
      const outfit = data?.data;
      return api
        .post("/api/generations/image", {
          outfitId: id,
          provider: outfit?.providerPreference || "MINIMAX",
          model: outfit?.imageModel || "image-01",
          count: outfit?.imageCount || 4,
        })
        .then((r) => r.data);
    },
    onSuccess: (r) => {
      message.success(`已提交 ${r.data.jobIds.length} 个首帧生成任务`);
      queryClient.invalidateQueries({ queryKey: ["outfit", id] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "提交失败"),
  });

  const genVideoMut = useMutation({
    mutationFn: (inputAssetId: string) => {
      const outfit = data?.data;
      return api
        .post("/api/generations/video", {
          outfitId: id,
          inputAssetId,
          provider: outfit?.providerPreference || "MINIMAX",
          model: outfit?.videoModel || "Hailuo-2.3-Fast",
          count: outfit?.videoCount || 2,
          durationSec: outfit?.durationSec || 6,
          resolution: outfit?.resolution || "768p",
        })
        .then((r) => r.data);
    },
    onSuccess: (r) => {
      message.success(`已提交 ${r.data.jobIds.length} 个视频生成任务`);
      queryClient.invalidateQueries({ queryKey: ["outfit", id] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "提交失败"),
  });

  const selectFrameMut = useMutation({
    mutationFn: ({ assetId, selected }: { assetId: string; selected: boolean }) =>
      api.post(`/api/assets/${assetId}/select-frame`, { outfitId: id, selected }).then((r) => r.data),
    onSuccess: () => {
      message.success("已更新选帧");
      queryClient.invalidateQueries({ queryKey: ["outfit", id] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "操作失败"),
  });

  const retryMut = useMutation({
    mutationFn: (jobId: string) =>
      api.post(`/api/jobs/${jobId}/retry`, {}).then((r) => r.data),
    onSuccess: () => {
      message.success("已重新排队");
      queryClient.invalidateQueries({ queryKey: ["outfit", id] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "重试失败"),
  });

  if (isLoading) return <Skeleton active />;
  if (!data?.data) return <Empty description="任务不存在" />;

  const outfit = data.data;
  const imageJobs: JobItem[] =
    outfit.generationJobs?.filter((j: JobItem) => j.stage === "IMAGE") || [];
  const videoJobs: JobItem[] =
    outfit.generationJobs?.filter((j: JobItem) => j.stage === "VIDEO") || [];
  const selectedFrame = imageJobs.find(
    (j: JobItem) => j.outputAsset?.isSelectedFrame,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title level={3} style={{ margin: 0 }}>
          {outfit.title}
        </Title>
        <div className="flex gap-2">
          <Button
            icon={<PictureOutlined />}
            onClick={() => genImagesMut.mutate()}
            loading={genImagesMut.isPending}
          >
            生成首帧
          </Button>
          {selectedFrame && (
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={() => genVideoMut.mutate(selectedFrame.outputAsset!.id)}
              loading={genVideoMut.isPending}
            >
              生成视频
            </Button>
          )}
          <Tag color={statusColors[outfit.status]}>{outfit.status}</Tag>
        </div>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总成本"
              value={outfit.totalCost}
              precision={2}
              prefix="¥"
              styles={{ content: { color: "#c9a96e" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="首帧任务"
              value={imageJobs.length}
              suffix={`/ ${outfit.imageCount || 4}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="视频任务"
              value={videoJobs.length}
              suffix={`/ ${outfit.videoCount || 2}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="模板"
              value={outfit.characterTemplate?.name || "-"}
              styles={{ content: { fontSize: 14 } }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="基础信息" size="small">
        <Descriptions
          column={2}
          size="small"
          items={[
            { label: "Provider", children: <Tag>{outfit.providerPreference}</Tag> },
            { label: "图片模型", children: outfit.imageModel },
            { label: "视频模型", children: outfit.videoModel },
            { label: "分辨率", children: outfit.resolution },
            { label: "时长", children: `${outfit.durationSec}s` },
            { label: "比例", children: outfit.aspectRatio },
          ]}
        />
      </Card>

      <Card title="首帧候选" size="small">
        {imageJobs.length === 0 ? (
          <Empty
            description="点击「生成首帧」开始"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => genImagesMut.mutate()}
              loading={genImagesMut.isPending}
            >
              生成首帧
            </Button>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {imageJobs.map((job) => (
              <Card
                key={job.id}
                size="small"
                className={`transition-all ${job.outputAsset?.isSelectedFrame ? "ring-2" : ""}`}
                style={
                  job.outputAsset?.isSelectedFrame
                    ? {
                        borderColor: "#c9a96e",
                        boxShadow: "0 0 0 2px rgba(201,169,110,0.3)",
                      }
                    : {}
                }
                actions={[
                  job.outputAsset ? (
                    <Button
                      key="select"
                      type="text"
                      size="small"
                      icon={
                        job.outputAsset.isSelectedFrame ? (
                          <StarFilled style={{ color: "#c9a96e" }} />
                        ) : (
                          <StarOutlined />
                        )
                      }
                      onClick={() =>
                        selectFrameMut.mutate({
                          assetId: job.outputAsset!.id,
                          selected: !job.outputAsset!.isSelectedFrame,
                        })
                      }
                    />
                  ) : null,
                  ["FAILED", "DOWNLOAD_FAILED"].includes(job.status) ? (
                    <Button
                      key="retry"
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => retryMut.mutate(job.id)}
                    />
                  ) : null,
                ].filter(Boolean)}
              >
                <div className="flex h-32 items-center justify-center overflow-hidden rounded bg-gray-50">
                  {job.outputAsset ? (
                    <img
                      src={`/api/assets/${job.outputAsset.id}/url`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Text type="secondary">
                      {job.status === "RUNNING" ? "生成中..." : job.status}
                    </Text>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Tag color={statusColors[job.status]}>{job.status}</Tag>
                  {job.seed && (
                    <Text type="secondary" className="text-xs">
                      seed:{job.seed}
                    </Text>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card title="视频任务" size="small">
        {videoJobs.length === 0 ? (
          <Empty
            description={
              selectedFrame ? "点击「生成视频」开始" : "请先选定一张首帧图"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {videoJobs.map((job) => (
              <Card key={job.id} size="small">
                <div className="flex h-48 items-center justify-center overflow-hidden rounded bg-gray-900">
                  {job.outputAsset ? (
                    <video
                      src={`/api/assets/${job.outputAsset.id}/url`}
                      controls
                      className="h-full w-full"
                      preload="none"
                    />
                  ) : (
                    <Text style={{ color: "#999" }}>
                      {job.status === "RUNNING" ? "生成中..." : job.status}
                    </Text>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag color={statusColors[job.status]}>{job.status}</Tag>
                    <Text type="secondary" className="text-xs">
                      {job.model}
                    </Text>
                  </div>
                  {["FAILED", "DOWNLOAD_FAILED"].includes(job.status) && (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => retryMut.mutate(job.id)}
                    >
                      重试
                    </Button>
                  )}
                </div>
                {job.errorMessage && (
                  <Text type="danger" className="mt-1 block text-xs">
                    {job.errorMessage}
                  </Text>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card title="Job 时间线" size="small">
        {outfit.generationJobs?.length === 0 ? (
          <Empty
            description="暂无任务记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Timeline
            items={outfit.generationJobs?.map((job: JobItem) => ({
              color:
                job.status === "SUCCEEDED"
                  ? "green"
                  : job.status === "FAILED"
                    ? "red"
                    : "blue",
              dot:
                job.status === "RUNNING" ? (
                  <ClockCircleOutlined spin />
                ) : undefined,
              children: (
                <div>
                  <Text strong>{job.stage}</Text>{" "}
                  <Tag color={statusColors[job.status]}>{job.status}</Tag>
                  <Text type="secondary" className="ml-2 text-xs">
                    {job.model}
                  </Text>
                  {job.costs.length > 0 && (
                    <Text className="ml-2 text-xs" style={{ color: "#c9a96e" }}>
                      ¥
                      {job.costs
                        .reduce((s, c) => s + Number(c.amount), 0)
                        .toFixed(4)}
                    </Text>
                  )}
                  <br />
                  <Text type="secondary" className="text-xs">
                    {new Date(job.createdAt).toLocaleString("zh-CN")}
                  </Text>
                  {job.errorMessage && (
                    <>
                      <br />
                      <Text type="danger" className="text-xs">
                        {job.errorMessage}
                      </Text>
                    </>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}
