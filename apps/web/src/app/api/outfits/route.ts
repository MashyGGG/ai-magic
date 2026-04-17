import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@ai-magic/db';
import { ok, paginated, fail } from '@ai-magic/shared';
import { paginationSchema } from '@ai-magic/shared';
import { findOutfitScenario } from '@ai-magic/prompts';
import type { OutfitScenarioPromptSnapshot } from '@ai-magic/prompts';
import type { Prisma } from '@ai-magic/db';
import { requireUser, handleApiError } from '@/lib/api-utils';

const createSchema = z.object({
  title: z.string().min(1, '任务标题不能为空'),
  characterTemplateId: z.string().min(1, '请选择角色模板'),
  topDesc: z.string().optional(),
  bottomDesc: z.string().optional(),
  shoesDesc: z.string().optional(),
  bagDesc: z.string().optional(),
  accessoriesDesc: z.string().optional(),
  materialDesc: z.string().optional(),
  colorDesc: z.string().optional(),
  backgroundDesc: z.string().optional(),
  sceneTemplateId: z.string().optional(),
  cameraTemplate: z.string().optional(),
  motionTemplate: z.string().optional(),
  scenarioPresetId: z.string().optional(),
  aspectRatio: z.string().default('9:16'),
  durationSec: z.number().int().min(2).max(10).default(6),
  resolution: z.string().default('768p'),
  providerPreference: z.enum(['MINIMAX', 'RUNWAY', 'JIMENG', 'OPENAI']).default('MINIMAX'),
  imageModel: z.string().default('image-01'),
  videoModel: z.string().default('Hailuo-2.3-Fast'),
  imageCount: z.number().int().min(1).max(8).default(4),
  videoCount: z.number().int().min(1).max(4).default(2),
});

async function buildPromptSnapshot(
  scenarioPresetId: string | undefined,
): Promise<OutfitScenarioPromptSnapshot | null> {
  if (!scenarioPresetId) return null;
  const preset = await findOutfitScenario(scenarioPresetId);
  if (!preset) return null;
  return {
    presetId: preset.id,
    presetVersion: preset.version,
    aspectRatio: preset.aspectRatio,
    image: preset.image,
    video: preset.video,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const { page, pageSize } = paginationSchema.parse({
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
    });
    const status = url.searchParams.get('status');
    const keyword = url.searchParams.get('keyword');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (keyword) where.title = { contains: keyword, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.outfit.findMany({
        where,
        include: {
          characterTemplate: { select: { id: true, name: true } },
          _count: { select: { generationJobs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.outfit.count({ where }),
    ]);

    return NextResponse.json(paginated(items, total, page, pageSize));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('INVALID_INPUT', parsed.error.issues[0].message), {
        status: 400,
      });
    }

    if (parsed.data.scenarioPresetId) {
      const preset = await findOutfitScenario(parsed.data.scenarioPresetId);
      if (!preset) {
        return NextResponse.json(
          fail('INVALID_INPUT', `场景预设不存在：${parsed.data.scenarioPresetId}`),
          { status: 400 },
        );
      }
    }

    const promptSnapshotJson = await buildPromptSnapshot(parsed.data.scenarioPresetId);

    const outfit = await prisma.outfit.create({
      data: {
        ...parsed.data,
        promptSnapshotJson: (promptSnapshotJson as unknown as Prisma.InputJsonValue) ?? undefined,
        createdById: user.userId,
      },
    });

    return NextResponse.json(ok(outfit), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
