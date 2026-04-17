'use client';

import { Tag, Tooltip, Typography, Empty } from 'antd';
import type { ResolveOutput, ResolveFromRowOutput, SegmentSource } from '@ai-magic/prompts';

const { Text } = Typography;

export type PromptResolved =
  | ResolveOutput
  | ResolveFromRowOutput
  | { text?: string; promptText?: string; json: ResolveOutput['json']; promptJson?: never }
  | null;

interface SourceMeta {
  label: string;
  color: string;
  desc: string;
}

const SOURCE_META: Record<SegmentSource, SourceMeta> = {
  preset: {
    label: '预设',
    color: 'purple',
    desc: '来自所选场景预设的原文段落',
  },
  character_template: {
    label: '角色模板',
    color: 'magenta',
    desc: '来自角色模板字段拼接，覆盖预设中对应人物描述',
  },
  user: {
    label: '用户输入',
    color: 'geekblue',
    desc: '来自表单用户输入，覆盖预设对应段',
  },
  scene_template: {
    label: '场景模板',
    color: 'cyan',
    desc: '来自英文 SCENE_TEMPLATES 静态枚举',
  },
  camera_template: {
    label: '镜头模板',
    color: 'blue',
    desc: '来自英文 CAMERA_TEMPLATES 静态枚举',
  },
  motion_template: {
    label: '动作模板',
    color: 'blue',
    desc: '来自英文 MOTION_TEMPLATES 静态枚举',
  },
  reference_image: {
    label: '参考图',
    color: 'gold',
    desc: '因角色模板存在参考图而追加的人物一致性约束',
  },
  fallback: {
    label: '通用',
    color: 'default',
    desc: '无论是否选预设都恒定追加（质量/稳定性约束）',
  },
};

const SEGMENT_LABEL: Record<string, string> = {
  character: '人物',
  referenceConstraint: '参考图约束',
  outfit: '穿搭',
  style: '风格',
  composition: '构图',
  scene: '场景',
  lighting: '光线',
  camera: '镜头',
  quality: '质量',
  stability: '稳定性',
  start: '起始动作',
  motion: '动作',
  detail: '细节',
  background: '背景',
  clothingStability: '服装稳定',
  faceStability: '面部稳定',
  bgStability: '背景稳定',
  rhythm: '节奏',
  face: '面部',
  material: '面料/配色',
};

export interface PromptSegmentsViewProps {
  resolved: PromptResolved;
  emptyText?: string;
}

function pickJson(resolved: NonNullable<PromptResolved>): ResolveOutput['json'] | null {
  if ('json' in resolved && resolved.json) return resolved.json;
  if ('promptJson' in resolved && resolved.promptJson)
    return resolved.promptJson as ResolveOutput['json'];
  return null;
}

export function PromptSegmentsView({
  resolved,
  emptyText = '暂无 Prompt 数据',
}: PromptSegmentsViewProps) {
  if (!resolved) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const json = pickJson(resolved);
  if (!json) {
    return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  const entries = Object.entries(json.segments);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Tag color={json.mode === 'preset' ? 'purple' : 'default'}>
          {json.mode === 'preset' ? `preset@v${json.presetVersion ?? '?'}` : 'modular'}
        </Tag>
        {json.presetId && <Tag>{json.presetId}</Tag>}
        <Tag color="blue">aspect {json.aspectRatio}</Tag>
      </div>
      <div className="space-y-2">
        {entries.map(([key, seg]) => {
          const meta = SOURCE_META[seg.source] ?? SOURCE_META.fallback;
          return (
            <div key={key} className="rounded border border-gray-100 bg-gray-50 p-2">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Text strong className="text-xs">
                  {SEGMENT_LABEL[key] ?? key}
                </Text>
                <Tooltip title={meta.desc}>
                  <Tag color={meta.color} className="cursor-help">
                    {meta.label}
                  </Tag>
                </Tooltip>
              </div>
              <div className="font-mono text-xs leading-relaxed text-gray-700">{seg.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
