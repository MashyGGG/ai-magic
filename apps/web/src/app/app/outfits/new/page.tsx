"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Typography,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Card,
  Collapse,
  Statistic,
  App,
} from "antd";
import { useRouter } from "next/navigation";
import {
  CAMERA_TEMPLATES,
  MOTION_TEMPLATES,
  SCENE_TEMPLATES,
  buildImagePrompt,
} from "@ai-magic/prompts";
import api from "@/lib/axios";

const { Title, Text, Paragraph } = Typography;

const COST_TABLE: Record<string, Record<string, number>> = {
  MINIMAX: {
    "image-01": 0.025,
    "Hailuo-2.3-Fast:768p": 1.35,
    "Hailuo-2.3-Fast:1080p": 2.31,
    "Hailuo-2.3:1080p": 3.5,
  },
};

export default function NewOutfitPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const { data: templatesData } = useQuery({
    queryKey: ["templates-select"],
    queryFn: () =>
      api.get("/api/character-templates?pageSize=100").then((r) => r.data),
  });

  const templates = templatesData?.data?.items || [];

  const selectedTemplate = useMemo(() => {
    const tid = formValues.characterTemplateId as string;
    return templates.find((t: { id: string }) => t.id === tid);
  }, [formValues.characterTemplateId, templates]);

  const promptPreview = useMemo(() => {
    if (!selectedTemplate) return null;
    return buildImagePrompt({
      character: {
        genderStyle: selectedTemplate.genderStyle,
        ageStyle: selectedTemplate.ageStyle,
        faceDesc: selectedTemplate.faceDesc,
        hairDesc: selectedTemplate.hairDesc,
        skinDesc: selectedTemplate.skinDesc,
        bodyDesc: selectedTemplate.bodyDesc,
        vibeDesc: selectedTemplate.vibeDesc,
      },
      outfit: {
        topDesc: formValues.topDesc as string,
        bottomDesc: formValues.bottomDesc as string,
        shoesDesc: formValues.shoesDesc as string,
        bagDesc: formValues.bagDesc as string,
        accessoriesDesc: formValues.accessoriesDesc as string,
        materialDesc: formValues.materialDesc as string,
        colorDesc: formValues.colorDesc as string,
      },
      cameraId: formValues.cameraTemplate as string,
      sceneId: formValues.sceneDesc as string,
      backgroundDesc: formValues.backgroundDesc as string,
    });
  }, [formValues, selectedTemplate]);

  const costEstimate = useMemo(() => {
    const provider = (formValues.providerPreference as string) || "MINIMAX";
    const imageModel = (formValues.imageModel as string) || "image-01";
    const videoModel = (formValues.videoModel as string) || "Hailuo-2.3-Fast";
    const resolution = (formValues.resolution as string) || "768p";
    const imageCount = (formValues.imageCount as number) || 4;
    const videoCount = (formValues.videoCount as number) || 2;

    const table = COST_TABLE[provider] || {};
    const imgCost = (table[imageModel] || 0) * imageCount;
    const vidKey = `${videoModel}:${resolution}`;
    const vidCost = (table[vidKey] || 0) * videoCount;
    return { imgCost, vidCost, total: imgCost + vidCost, currency: "CNY" };
  }, [formValues]);

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.post("/api/outfits", values).then((r) => r.data),
    onSuccess: (res) => {
      message.success("任务创建成功");
      router.push(`/app/outfits/${res.data.id}`);
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : "创建失败");
    },
  });

  return (
    <div>
      <Title level={3}>新建穿搭任务</Title>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Form (60%) */}
        <div className="lg:col-span-3">
          <Card>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, all) => setFormValues(all)}
              onFinish={(values) => createMutation.mutate(values)}
              initialValues={{
                aspectRatio: "9:16",
                durationSec: 6,
                resolution: "768p",
                providerPreference: "MINIMAX",
                imageModel: "image-01",
                videoModel: "Hailuo-2.3-Fast",
                imageCount: 4,
                videoCount: 2,
              }}
            >
              <Form.Item
                name="title"
                label="任务标题"
                rules={[{ required: true, message: "请输入标题" }]}
              >
                <Input placeholder="例：春季通勤西装裙穿搭" />
              </Form.Item>

              <Form.Item
                name="characterTemplateId"
                label="角色模板"
                rules={[{ required: true, message: "请选择角色模板" }]}
              >
                <Select
                  placeholder="选择角色模板"
                  showSearch
                  optionFilterProp="label"
                  options={templates.map((t: { id: string; name: string }) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
              </Form.Item>

              <Collapse
                ghost
                defaultActiveKey={["outfit"]}
                items={[
                  {
                    key: "outfit",
                    label: "穿搭描述",
                    children: (
                      <>
                        <Form.Item name="topDesc" label="上装">
                          <Input placeholder="例：浅灰修身西装外套" />
                        </Form.Item>
                        <Form.Item name="bottomDesc" label="下装">
                          <Input placeholder="例：同色系短裙" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="shoesDesc" label="鞋子">
                            <Input placeholder="例：黑色尖头高跟鞋" />
                          </Form.Item>
                          <Form.Item name="bagDesc" label="包">
                            <Input placeholder="例：小号皮质手提包" />
                          </Form.Item>
                        </div>
                        <Form.Item name="accessoriesDesc" label="配饰">
                          <Input placeholder="例：金属耳环" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="materialDesc" label="面料/材质">
                            <Input placeholder="例：西装面料有轻微纹理" />
                          </Form.Item>
                          <Form.Item name="colorDesc" label="配色">
                            <Input placeholder="例：浅灰 + 黑色点缀" />
                          </Form.Item>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: "scene",
                    label: "场景与镜头",
                    children: (
                      <>
                        <Form.Item name="backgroundDesc" label="背景描述">
                          <Input placeholder="例：干净高级的都市摄影棚" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="cameraTemplate" label="镜头模板">
                            <Select
                              allowClear
                              placeholder="选择"
                              options={CAMERA_TEMPLATES.map((c) => ({
                                value: c.id,
                                label: c.label,
                              }))}
                            />
                          </Form.Item>
                          <Form.Item name="motionTemplate" label="动作模板">
                            <Select
                              allowClear
                              placeholder="选择"
                              options={MOTION_TEMPLATES.map((m) => ({
                                value: m.id,
                                label: m.label,
                              }))}
                            />
                          </Form.Item>
                        </div>
                        <Form.Item name="sceneDesc" label="场景模板">
                          <Select
                            allowClear
                            placeholder="选择"
                            options={SCENE_TEMPLATES.map((s) => ({
                              value: s.id,
                              label: s.label,
                            }))}
                          />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: "params",
                    label: "模型参数",
                    children: (
                      <>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="providerPreference" label="Provider">
                            <Select
                              options={[{ value: "MINIMAX", label: "MiniMax" }]}
                            />
                          </Form.Item>
                          <Form.Item name="imageModel" label="图片模型">
                            <Select
                              options={[
                                { value: "image-01", label: "image-01" },
                              ]}
                            />
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="videoModel" label="视频模型">
                            <Select
                              options={[
                                {
                                  value: "Hailuo-2.3-Fast",
                                  label: "Hailuo 2.3-Fast",
                                },
                                { value: "Hailuo-2.3", label: "Hailuo 2.3" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="resolution" label="分辨率">
                            <Select
                              options={[
                                { value: "768p", label: "768P (低成本)" },
                                { value: "1080p", label: "1080P (高质量)" },
                              ]}
                            />
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4">
                          <Form.Item name="aspectRatio" label="比例">
                            <Select
                              options={[
                                { value: "9:16", label: "9:16 竖版" },
                                { value: "16:9", label: "16:9 横版" },
                                { value: "1:1", label: "1:1 方形" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="imageCount" label="首帧张数">
                            <InputNumber
                              min={1}
                              max={8}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                          <Form.Item name="videoCount" label="视频条数">
                            <InputNumber
                              min={1}
                              max={4}
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        </div>
                        <Form.Item name="durationSec" label="视频时长(秒)">
                          <InputNumber
                            min={2}
                            max={10}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />

              <div className="mt-6">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={createMutation.isPending}
                  block
                >
                  创建任务
                </Button>
              </div>
            </Form>
          </Card>
        </div>

        {/* Right: Preview (40%) */}
        <div className="lg:col-span-2">
          <div className="sticky top-4 space-y-4">
            <Card title="预计成本" size="small">
              <div className="grid grid-cols-2 gap-4">
                <Statistic
                  title="图片成本"
                  value={costEstimate.imgCost}
                  precision={2}
                  prefix="¥"
                  style={{ color: "#c9a96e" }}
                />
                <Statistic
                  title="视频成本"
                  value={costEstimate.vidCost}
                  precision={2}
                  prefix="¥"
                  style={{ color: "#c9a96e" }}
                />
              </div>
              <div className="mt-3 border-t pt-3">
                <Statistic
                  title="预计总计"
                  value={costEstimate.total}
                  precision={2}
                  prefix="¥"
                  style={{ color: "#c9a96e", fontSize: 24 }}
                />
                <Text type="secondary" className="text-xs">
                  含重试预算约 ¥{(costEstimate.total * 2).toFixed(2)}
                </Text>
              </div>
            </Card>

            <Card title="Prompt 预览" size="small">
              {promptPreview ? (
                <div className="max-h-60 overflow-auto rounded bg-gray-50 p-3 font-mono text-xs leading-relaxed">
                  {promptPreview.text}
                </div>
              ) : (
                <Paragraph type="secondary">
                  选择角色模板并填写穿搭信息后，将自动生成 Prompt 预览
                </Paragraph>
              )}
            </Card>

            <Card title="生成策略" size="small">
              <div className="space-y-2 text-sm text-gray-500">
                <p>1. 先生成多张首帧候选图，人工选定后再生视频</p>
                <p>2. 默认使用低成本版本试跑，确认后升级分辨率</p>
                <p>3. 动作保持轻柔，避免服装变形和肢体异常</p>
                <p>4. 所有结果自动入库并记录成本</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
