import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { prisma } from '@ai-magic/db';
import { ok, fail } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';
import { redis } from '@/lib/redis';

const queue = new Queue('image-generation', { connection: redis });

const schema = z.object({
  outfitId: z.string().min(1),
  provider: z.enum(['MINIMAX', 'RUNWAY', 'JIMENG', 'OPENAI']).default('MINIMAX'),
  model: z.string().default('image-01'),
  count: z.number().int().min(1).max(8).default(4),
  useReference: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('INVALID_INPUT', parsed.error.issues[0].message), { status: 400 });
    }

    const { outfitId, provider, model, count } = parsed.data;

    const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
    if (!outfit) {
      return NextResponse.json(fail('NOT_FOUND', '穿搭任务不存在'), { status: 404 });
    }

    const jobIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const genJob = await prisma.generationJob.create({
        data: {
          outfitId,
          stage: 'IMAGE',
          provider,
          model,
          status: 'QUEUED',
          candidateIndex: i,
          resolution: outfit.resolution,
        },
      });

      await queue.add('generate-image', { generationJobId: genJob.id });
      jobIds.push(genJob.id);
    }

    await prisma.outfit.update({
      where: { id: outfitId },
      data: { status: 'GENERATED' },
    });

    return NextResponse.json(ok({ jobIds }));
  } catch (error) {
    return handleApiError(error);
  }
}
