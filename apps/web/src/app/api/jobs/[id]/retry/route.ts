import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { prisma } from '@ai-magic/db';
import { ok, fail } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';
import { redis } from '@/lib/redis';

const imageQueue = new Queue('image-generation', { connection: redis });
const videoQueue = new Queue('video-generation', { connection: redis });

const schema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    const job = await prisma.generationJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json(fail('NOT_FOUND', '任务不存在'), { status: 404 });
    }

    const retryableStatuses = ['FAILED', 'DOWNLOAD_FAILED', 'CANCELED', 'BUDGET_EXCEEDED'];
    if (!retryableStatuses.includes(job.status)) {
      return NextResponse.json(fail('JOB_NOT_RETRYABLE', `状态 ${job.status} 不可重试`), { status: 400 });
    }

    await prisma.generationJob.update({
      where: { id },
      data: {
        status: 'QUEUED',
        retryCount: { increment: 1 },
        retryReason: parsed.data?.reason || null,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
      },
    });

    const queue = job.stage === 'IMAGE' ? imageQueue : videoQueue;
    const queueJob = job.stage === 'IMAGE' ? 'generate-image' : 'generate-video';
    await queue.add(queueJob, { generationJobId: id });

    return NextResponse.json(ok({ retried: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
