'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Tag,
  Tabs,
  Modal,
  App,
} from 'antd';
import { useRouter } from 'next/navigation';
import {
  CAMERA_TEMPLATES,
  MOTION_TEMPLATES,
  SCENE_TEMPLATES,
  resolveImagePromptFromOutfitRow,
  resolveVideoPromptFromOutfitRow,
  type OutfitScenarioPreset,
  type OutfitScenarioTagInfo,
} from '@ai-magic/prompts';
import api from '@/lib/axios';
import { PromptSegmentsView } from '@/components/prompt-segments-view';

const { Title, Text, Paragraph } = Typography;
const { CheckableTag } = Tag;

const COST_TABLE: Record<string, Record<string, number>> = {
  MINIMAX: {
    'image-01': 0.025,
    'Hailuo-2.3-Fast:768p': 1.35,
    'Hailuo-2.3-Fast:1080p': 2.31,
    'Hailuo-2.3:1080p': 3.5,
  },
};

interface CharacterTemplateLike {
  id: string;
  name: string;
  genderStyle?: string | null;
  ageStyle?: string | null;
  faceDesc?: string | null;
  hairDesc?: string | null;
  skinDesc?: string | null;
  bodyDesc?: string | null;
  vibeDesc?: string | null;
  referenceAssetId?: string | null;
}

interface PresetsResp {
  data: {
    items: OutfitScenarioPreset[];
    tags: OutfitScenarioTagInfo[];
  };
}

export default function NewOutfitPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: templatesData } = useQuery({
    queryKey: ['templates-select'],
    queryFn: () => api.get('/api/character-templates?pageSize=100').then((r) => r.data),
  });

  const templates: CharacterTemplateLike[] = templatesData?.data?.items || [];

  const { data: presetsData } = useQuery<PresetsResp>({
    queryKey: ['scenario-presets'],
    queryFn: () => api.get('/api/scenario-presets').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const presets = presetsData?.data?.items || [];
  const tags = presetsData?.data?.tags || [];

  const filteredPresets = useMemo(() => {
    if (selectedTags.length === 0) return presets;
    return presets.filter((p) => selectedTags.every((t) => p.tags.includes(t)));
  }, [presets, selectedTags]);

  const selectedTemplate = useMemo(() => {
    const tid = formValues.characterTemplateId as string;
    return templates.find((t) => t.id === tid);
  }, [formValues.characterTemplateId, templates]);

  const selectedPreset = useMemo(() => {
    const pid = formValues.scenarioPresetId as string | undefined;
    return pid ? presets.find((p) => p.id === pid) : undefined;
  }, [formValues.scenarioPresetId, presets]);

  // Build a synthetic "outfit row" from form values for the resolver.
  const outfitRow = useMemo(() => {
    return {
      topDesc: (formValues.topDesc as string) || null,
      bottomDesc: (formValues.bottomDesc as string) || null,
      shoesDesc: (formValues.shoesDesc as string) || null,
      bagDesc: (formValues.bagDesc as string) || null,
      accessoriesDesc: (formValues.accessoriesDesc as string) || null,
      materialDesc: (formValues.materialDesc as string) || null,
      colorDesc: (formValues.colorDesc as string) || null,
      backgroundDesc: (formValues.backgroundDesc as string) || null,
      sceneTemplateId: (formValues.sceneTemplateId as string) || null,
      cameraTemplate: (formValues.cameraTemplate as string) || null,
      motionTemplate: (formValues.motionTemplate as string) || null,
      aspectRatio: (formValues.aspectRatio as string) || null,
      characterTemplate: selectedTemplate
        ? {
            genderStyle: selectedTemplate.genderStyle ?? null,
            ageStyle: selectedTemplate.ageStyle ?? null,
            faceDesc: selectedTemplate.faceDesc ?? null,
            hairDesc: selectedTemplate.hairDesc ?? null,
            skinDesc: selectedTemplate.skinDesc ?? null,
            bodyDesc: selectedTemplate.bodyDesc ?? null,
            vibeDesc: selectedTemplate.vibeDesc ?? null,
            referenceAssetId: selectedTemplate.referenceAssetId ?? null,
          }
        : null,
    };
  }, [formValues, selectedTemplate]);

  const imageResolved = useMemo(
    () =>
      resolveImagePromptFromOutfitRow(outfitRow, {
        preset: selectedPreset ?? null,
      }),
    [outfitRow, selectedPreset],
  );
  const videoResolved = useMemo(
    () =>
      resolveVideoPromptFromOutfitRow(outfitRow, {
        preset: selectedPreset ?? null,
      }),
    [outfitRow, selectedPreset],
  );

  const previewReady = Boolean(selectedTemplate || selectedPreset);

  // Auto-sync aspectRatio on preset selection (via Modal confirm).
  useEffect(() => {
    if (!selectedPreset) return;
    if (formValues.aspectRatio !== selectedPreset.aspectRatio) {
      // Don't force; just hint via UI. The Modal handles initial fill.
    }
  }, [selectedPreset, formValues.aspectRatio]);

  const handlePresetChange = (presetId: string | undefined) => {
    if (!presetId) {
      form.setFieldValue('scenarioPresetId', undefined);
      setFormValues((v) => ({ ...v, scenarioPresetId: undefined }));
      return;
    }
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    modal.confirm({
      title: `应用「${preset.label}」预设？`,
      width: 520,
      content: (
        <div className="space-y-2 text-sm">
          <Paragraph>将自动同步以下结构化字段（可继续微调）：</Paragraph>
          <ul className="list-disc pl-5 text-gray-600">
            <li>
              比例：<Text code>{preset.aspectRatio}</Text>
            </li>
            {preset.recommendedDuration && (
              <li>
                视频时长：
                <Text code>{preset.recommendedDuration}s</Text>
              </li>
            )}
          </ul>
          <Paragraph type="secondary" className="text-xs">
            「穿搭描述」字段不会被覆盖；留空时解析器会自动用预设原文段落。 若已填，则用户输入优先。
          </Paragraph>
        </div>
      ),
      okText: '应用',
      cancelText: '取消',
      onOk: () => {
        const patch: Record<string, unknown> = {
          scenarioPresetId: preset.id,
          aspectRatio: preset.aspectRatio,
        };
        if (preset.recommendedDuration) {
          patch.durationSec = preset.recommendedDuration;
        }
        form.setFieldsValue(patch);
        setFormValues((v) => ({ ...v, ...patch }));
      },
      onCancel: () => {
        form.setFieldValue('scenarioPresetId', undefined);
      },
    });
  };

  const costEstimate = useMemo(() => {
    const provider = (formValues.providerPreference as string) || 'MINIMAX';
    const imageModel = (formValues.imageModel as string) || 'image-01';
    const videoModel = (formValues.videoModel as string) || 'Hailuo-2.3-Fast';
    const resolution = (formValues.resolution as string) || '768p';
    const imageCount = (formValues.imageCount as number) || 4;
    const videoCount = (formValues.videoCount as number) || 2;

    const table = COST_TABLE[provider] || {};
    const imgCost = (table[imageModel] || 0) * imageCount;
    const vidKey = `${videoModel}:${resolution}`;
    const vidCost = (table[vidKey] || 0) * videoCount;
    return { imgCost, vidCost, total: imgCost + vidCost, currency: 'CNY' };
  }, [formValues]);

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.post('/api/outfits', values).then((r) => r.data),
    onSuccess: (res) => {
      message.success('任务创建成功');
      router.push(`/app/outfits/${res.data.id}`);
    },
    onError: (err) => {
      message.error(err instanceof Error ? err.message : '创建失败');
    },
  });

  const presetActive = Boolean(selectedPreset);

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
                aspectRatio: '9:16',
                durationSec: 6,
                resolution: '768p',
                providerPreference: 'MINIMAX',
                imageModel: 'image-01',
                videoModel: 'Hailuo-2.3-Fast',
                imageCount: 4,
                videoCount: 2,
              }}
            >
              <Form.Item
                name="title"
                label="任务标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="例：春季通勤西装裙穿搭" />
              </Form.Item>

              <Form.Item
                name="characterTemplateId"
                label="角色模板"
                rules={[{ required: true, message: '请选择角色模板' }]}
              >
                <Select
                  placeholder="选择角色模板"
                  showSearch
                  optionFilterProp="label"
                  options={templates.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="场景预设"
                tooltip="选择一套来自 30 套精修文案的场景预设；未选 = 沿用旧的模块化拼接逻辑"
              >
                <div className="space-y-2">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 16).map((t) => (
                        <CheckableTag
                          key={t.value}
                          checked={selectedTags.includes(t.value)}
                          onChange={(checked) =>
                            setSelectedTags((prev) =>
                              checked ? [...prev, t.value] : prev.filter((x) => x !== t.value),
                            )
                          }
                        >
                          {t.value}
                          <Text type="secondary" className="ml-1 text-xs">
                            {t.count}
                          </Text>
                        </CheckableTag>
                      ))}
                    </div>
                  )}
                  <Form.Item name="scenarioPresetId" noStyle>
                    <Select
                      allowClear
                      showSearch
                      placeholder={`从 ${filteredPresets.length} 个预设中挑选`}
                      optionFilterProp="label"
                      onChange={(v) => handlePresetChange(v as string | undefined)}
                      options={filteredPresets.map((p) => ({
                        value: p.id,
                        label: `${p.index}. ${p.label}`,
                      }))}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  {selectedPreset && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPreset.tags.map((t) => (
                        <Tag key={t} color="purple">
                          {t}
                        </Tag>
                      ))}
                      <Tag color="blue">{selectedPreset.aspectRatio}</Tag>
                      {selectedPreset.recommendedDuration && (
                        <Tag color="cyan">推荐 {selectedPreset.recommendedDuration}s</Tag>
                      )}
                    </div>
                  )}
                </div>
              </Form.Item>

              <Collapse
                ghost
                defaultActiveKey={['outfit']}
                items={[
                  {
                    key: 'outfit',
                    label: '穿搭描述',
                    children: (
                      <>
                        {presetActive && (
                          <Paragraph type="secondary" className="text-xs">
                            已启用预设，留空将使用预设原文穿搭段；任意一项填写则按用户输入覆盖整段。
                          </Paragraph>
                        )}
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
                    key: 'scene',
                    label: '场景与镜头',
                    children: (
                      <>
                        {presetActive && (
                          <Paragraph type="secondary" className="text-xs">
                            未填则使用预设默认；填入将覆盖对应段。
                          </Paragraph>
                        )}
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
                        <Form.Item name="sceneTemplateId" label="场景模板">
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
                    key: 'params',
                    label: '模型参数',
                    children: (
                      <>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="providerPreference" label="Provider">
                            <Select options={[{ value: 'MINIMAX', label: 'MiniMax' }]} />
                          </Form.Item>
                          <Form.Item name="imageModel" label="图片模型">
                            <Select options={[{ value: 'image-01', label: 'image-01' }]} />
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <Form.Item name="videoModel" label="视频模型">
                            <Select
                              options={[
                                {
                                  value: 'Hailuo-2.3-Fast',
                                  label: 'Hailuo 2.3-Fast',
                                },
                                { value: 'Hailuo-2.3', label: 'Hailuo 2.3' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="resolution" label="分辨率">
                            <Select
                              options={[
                                { value: '768p', label: '768P (低成本)' },
                                { value: '1080p', label: '1080P (高质量)' },
                              ]}
                            />
                          </Form.Item>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4">
                          <Form.Item name="aspectRatio" label="比例">
                            <Select
                              options={[
                                { value: '9:16', label: '9:16 竖版' },
                                { value: '16:9', label: '16:9 横版' },
                                { value: '1:1', label: '1:1 方形' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item name="imageCount" label="首帧张数">
                            <InputNumber min={1} max={8} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item name="videoCount" label="视频条数">
                            <InputNumber min={1} max={4} style={{ width: '100%' }} />
                          </Form.Item>
                        </div>
                        <Form.Item name="durationSec" label="视频时长(秒)">
                          <InputNumber min={2} max={10} style={{ width: '100%' }} />
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
                  style={{ color: '#c9a96e' }}
                />
                <Statistic
                  title="视频成本"
                  value={costEstimate.vidCost}
                  precision={2}
                  prefix="¥"
                  style={{ color: '#c9a96e' }}
                />
              </div>
              <div className="mt-3 border-t pt-3">
                <Statistic
                  title="预计总计"
                  value={costEstimate.total}
                  precision={2}
                  prefix="¥"
                  style={{ color: '#c9a96e', fontSize: 24 }}
                />
                <Text type="secondary" className="text-xs">
                  含重试预算约 ¥{(costEstimate.total * 2).toFixed(2)}
                </Text>
              </div>
            </Card>

            <Card title="Prompt 预览" size="small" styles={{ body: { padding: 12 } }}>
              {previewReady ? (
                <Tabs
                  defaultActiveKey="image"
                  size="small"
                  items={[
                    {
                      key: 'image',
                      label: '图片',
                      children: (
                        <div className="max-h-[480px] overflow-auto">
                          <PromptSegmentsView resolved={imageResolved} />
                        </div>
                      ),
                    },
                    {
                      key: 'video',
                      label: '视频',
                      children: (
                        <div className="max-h-[480px] overflow-auto">
                          <PromptSegmentsView resolved={videoResolved} />
                        </div>
                      ),
                    },
                    {
                      key: 'raw',
                      label: '纯文本',
                      children: (
                        <div className="space-y-3">
                          <div>
                            <Text strong className="text-xs">
                              图片
                            </Text>
                            <div className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs leading-relaxed">
                              {imageResolved.promptText}
                            </div>
                          </div>
                          <div>
                            <Text strong className="text-xs">
                              视频
                            </Text>
                            <div className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs leading-relaxed">
                              {videoResolved.promptText}
                            </div>
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              ) : (
                <Paragraph type="secondary">
                  选择角色模板或场景预设后，将自动生成 Prompt 预览
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
