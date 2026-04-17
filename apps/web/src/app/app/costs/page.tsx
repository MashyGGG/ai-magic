"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Statistic,
  Row,
  Col,
  DatePicker,
  Skeleton,
  Table,
  Tag,
} from "antd";
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function CostsPage() {
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["costs-summary", dateRange],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set("from", dateRange[0]);
        params.set("to", dateRange[1]);
      }
      return api.get(`/api/costs/summary?${params}`).then((r) => r.data);
    },
  });

  const summary = data?.data;

  const providerData = summary?.byProvider
    ? Object.entries(summary.byProvider).map(([name, amount]) => ({
        key: name,
        name,
        amount: Number(amount),
      }))
    : [];

  const modelData = summary?.byModel
    ? Object.entries(summary.byModel).map(([name, amount]) => ({
        key: name,
        name,
        amount: Number(amount),
      }))
    : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={3} style={{ margin: 0 }}>
          成本统计
        </Title>
        <RangePicker
          onChange={(dates) => {
            if (dates?.[0] && dates?.[1]) {
              setDateRange([dates[0].toISOString(), dates[1].toISOString()]);
            } else {
              setDateRange(null);
            }
          }}
        />
      </div>

      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          <Row gutter={16} className="mb-6">
            <Col span={6}>
              <Card>
                <Statistic
                  title="总成本"
                  value={summary?.totalAmount || 0}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="CNY"
                  style={{ color: "#c9a96e" } as React.CSSProperties}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="总任务数" value={summary?.jobCount || 0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="成功率"
                  value={summary?.successRate || 0}
                  suffix="%"
                  style={{ color: "#52c41a" } as React.CSSProperties}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="失败任务"
                  value={summary?.failedCount || 0}
                  style={
                    {
                      color: summary?.failedCount > 0 ? "#ff4d4f" : undefined,
                    } as React.CSSProperties
                  }
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="按 Provider 分布" size="small">
                <Table
                  dataSource={providerData}
                  columns={[
                    {
                      title: "Provider",
                      dataIndex: "name",
                      render: (v: string) => <Tag>{v}</Tag>,
                    },
                    {
                      title: "金额 (CNY)",
                      dataIndex: "amount",
                      render: (v: number) => `¥${v.toFixed(4)}`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="按模型分布" size="small">
                <Table
                  dataSource={modelData}
                  columns={[
                    { title: "模型", dataIndex: "name" },
                    {
                      title: "金额 (CNY)",
                      dataIndex: "amount",
                      render: (v: number) => `¥${v.toFixed(4)}`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
