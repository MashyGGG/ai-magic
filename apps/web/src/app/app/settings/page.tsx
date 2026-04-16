"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  App,
  Skeleton,
  Divider,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;

export default function SettingsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings");
      return r.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      form.setFieldsValue({
        defaultProvider: data.data.defaultProvider || "MINIMAX",
        defaultImageModel: data.data.defaultImageModel || "image-01",
        defaultVideoModel: data.data.defaultVideoModel || "Hailuo-2.3-Fast",
        defaultImageCount: data.data.defaultImageCount || 4,
        defaultVideoCount: data.data.defaultVideoCount || 2,
        defaultDurationSec: data.data.defaultDurationSec || 6,
        defaultResolution: data.data.defaultResolution || "768p",
        maxRetryCount: data.data.maxRetryCount || 2,
        dailyBudgetLimit: data.data.dailyBudgetLimit || 100,
        minimaxApiKey: data.data.minimaxApiKey ? "••••••••" : "",
        runwayApiKey: data.data.runwayApiKey ? "••••••••" : "",
      });
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const cleaned = { ...values };
      if (cleaned.minimaxApiKey === "••••••••") delete cleaned.minimaxApiKey;
      if (cleaned.runwayApiKey === "••••••••") delete cleaned.runwayApiKey;

      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      return r.json();
    },
    onSuccess: (r) => {
      if (r.success) {
        message.success("设置已保存");
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      } else {
        message.error(r.error?.message || "保存失败");
      }
    },
  });

  if (isLoading) return <Skeleton active />;

  return (
    <div>
      <Title level={3}>系统设置</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => saveMutation.mutate(v)}
        className="max-w-2xl"
      >
        <Card title="Provider 配置" size="small" className="mb-4">
          <Form.Item name="defaultProvider" label="默认 Provider">
            <Select
              options={[
                { value: "MINIMAX", label: "MiniMax" },
                { value: "RUNWAY", label: "Runway (即将支持)", disabled: true },
              ]}
            />
          </Form.Item>
          <Form.Item name="minimaxApiKey" label="MiniMax API Key">
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
          <Form.Item name="runwayApiKey" label="Runway API Key">
            <Input.Password placeholder="输入 API Key" disabled />
          </Form.Item>
        </Card>

        <Card title="默认模型参数" size="small" className="mb-4">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="defaultImageModel" label="图片模型">
              <Select options={[{ value: "image-01", label: "image-01" }]} />
            </Form.Item>
            <Form.Item name="defaultVideoModel" label="视频模型">
              <Select
                options={[
                  { value: "Hailuo-2.3-Fast", label: "Hailuo 2.3-Fast" },
                  { value: "Hailuo-2.3", label: "Hailuo 2.3" },
                ]}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="defaultImageCount" label="默认图片张数">
              <InputNumber min={1} max={8} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="defaultVideoCount" label="默认视频条数">
              <InputNumber min={1} max={4} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="defaultDurationSec" label="默认时长(秒)">
              <InputNumber min={2} max={10} style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item name="defaultResolution" label="默认分辨率">
            <Select
              options={[
                { value: "768p", label: "768P (低成本)" },
                { value: "1080p", label: "1080P (高质量)" },
              ]}
            />
          </Form.Item>
        </Card>

        <Card title="成本与重试" size="small" className="mb-4">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="maxRetryCount" label="最大重试次数">
              <InputNumber min={0} max={5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="dailyBudgetLimit" label="日预算上限 (CNY)">
              <InputNumber min={0} step={10} style={{ width: "100%" }} />
            </Form.Item>
          </div>
        </Card>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          size="large"
          loading={saveMutation.isPending}
        >
          保存设置
        </Button>
      </Form>
    </div>
  );
}
