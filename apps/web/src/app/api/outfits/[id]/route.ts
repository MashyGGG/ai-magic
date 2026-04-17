import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@ai-magic/db';
import { ok, fail } from '@ai-magic/shared';
import { findOutfitScenario } from '@ai-magic/prompts';
import type { OutfitScenarioPromptSnapshot } from '@ai-magic/prompts';
import { Prisma } from '@ai-magic/db';
import { requireUser, handleApiError } from '@/lib/api-utils';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
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
  scenarioPresetId: z.string().nullable().optional(),
  status: z
    .enum(['DRAFT', 'GENERATED', 'REVIEWING', 'APPROVED', 'REJECTED', 'ARCHIVED'])
    .optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;

    const outfit = await prisma.outfit.findUnique({
      where: { id },
      include: {
        characterTemplate: true,
        generationJobs: {
          include: {
            outputAsset: {
              select: {
                id: true,
                storageKey: true,
                type: true,
                isSelectedFrame: true,
                reviewStatus: true,
              },
            },
            costs: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: { reviewer: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!outfit) {
      return NextResponse.json(fail('NOT_FOUND', '任务不存在'), {
        status: 404,
      });
    }

    const totalCost = outfit.generationJobs.reduce((sum, job) => {
      return sum + job.costs.reduce((s, c) => s + Number(c.amount), 0);
    }, 0);

    return NextResponse.json(ok({ ...outfit, totalCost }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('INVALID_INPUT', parsed.error.issues[0].message), {
        status: 400,
      });
    }

    const data: Prisma.OutfitUpdateInput = { ...parsed.data };

    if (Object.prototype.hasOwnProperty.call(parsed.data, 'scenarioPresetId')) {
      const nextId = parsed.data.scenarioPresetId;
      if (nextId === null || nextId === undefined) {
        data.promptSnapshotJson = Prisma.JsonNull;
      } else {
        const preset = await findOutfitScenario(nextId);
        if (!preset) {
          return NextResponse.json(fail('INVALID_INPUT', `场景预设不存在：${nextId}`), {
            status: 400,
          });
        }
        const snapshot: OutfitScenarioPromptSnapshot = {
          presetId: preset.id,
          presetVersion: preset.version,
          aspectRatio: preset.aspectRatio,
          image: preset.image,
          video: preset.video,
        };
        data.promptSnapshotJson = snapshot as unknown as Prisma.InputJsonValue;
      }
    }

    const outfit = await prisma.outfit.update({
      where: { id },
      data,
    });

    return NextResponse.json(ok(outfit));
  } catch (error) {
    return handleApiError(error);
  }
}
