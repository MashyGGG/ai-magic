"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Statistic,
  Row,
  Col,
  List,
  Tag,
  Button,
  Skeleton,
} from "antd";
import {
  DashboardOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  SkinOutlined,
  PictureOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: "default",
  GENERATED: "processing",
  REVIEWING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ARCHIVED: "default",
};

export default function DashboardPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/summary");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const summary = data?.data;

  return (
    <div className="space-y-6">
      <Title level={3}>控制台</Title>

      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日生成数"
                  value={summary?.todayGenCount || 0}
                  prefix={<ThunderboltOutlined />}
                  style={{ color: "#1a1a2e" } as React.CSSProperties}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日成功率"
                  value={summary?.todaySuccessRate || 0}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  style={{ color: "#52c41a" } as React.CSSProperties}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日成本"
                  value={summary?.todayCost || 0}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="CNY"
                  style={{ color: "#c9a96e" } as React.CSSProperties}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="flex h-full items-center justify-center">
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => router.push("/app/outfits/new")}
                  >
                    新建任务
                  </Button>
                  <Button
                    icon={<SkinOutlined />}
                    onClick={() => router.push("/app/templates")}
                  >
                    模板
                  </Button>
                  <Button
                    icon={<PictureOutlined />}
                    onClick={() => router.push("/app/assets")}
                  >
                    资产库
                  </Button>
                  <Button
                    icon={<AuditOutlined />}
                    onClick={() => router.push("/app/reviews")}
                  >
                    审核
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="最近任务" size="small">
                {summary?.recentOutfits?.length > 0 ? (
                  <List
                    size="small"
                    dataSource={summary.recentOutfits}
                    renderItem={(item: {
                      id: string;
                      title: string;
                      status: string;
                      createdAt: string;
                    }) => (
                      <List.Item
                        actions={[
                          <Button
                            key="view"
                            type="link"
                            size="small"
                            onClick={() =>
                              router.push(`/app/outfits/${item.id}`)
                            }
                          >
                            查看
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={item.title}
                          description={
                            <Text type="secondary" className="text-xs">
                              {new Date(item.createdAt).toLocaleString("zh-CN")}
                            </Text>
                          }
                        />
                        <Tag color={statusColors[item.status]}>
                          {item.status}
                        </Tag>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">暂无任务</Text>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="待审核资产" size="small">
                {summary?.pendingReviewAssets?.length > 0 ? (
                  <List
                    size="small"
                    dataSource={summary.pendingReviewAssets}
                    renderItem={(item: {
                      id: string;
                      type: string;
                      reviewStatus: string;
                      createdAt: string;
                    }) => (
                      <List.Item
                        actions={[
                          <Button
                            key="review"
                            type="link"
                            size="small"
                            onClick={() => router.push("/app/reviews")}
                          >
                            审核
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Tag
                              color={item.type === "IMAGE" ? "blue" : "purple"}
                            >
                              {item.type}
                            </Tag>
                          }
                          description={
                            <Text type="secondary" className="text-xs">
                              {new Date(item.createdAt).toLocaleString("zh-CN")}
                            </Text>
                          }
                        />
                        <Tag color={statusColors[item.reviewStatus]}>
                          {item.reviewStatus}
                        </Tag>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">暂无待审核</Text>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
