import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@ai-magic/db';
import { getProvider } from '@ai-magic/providers';
import { findOutfitScenario, resolveVideoPromptFromOutfitRow } from '@ai-magic/prompts';
import { storage } from '../lib/storage';
import { publishJobStatus } from '../lib/publish';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const pollingQueue = new Queue('task-polling', { connection });

interface VideoJobData {
  generationJobId: string;
}

export async function processVideoGeneration(job: Job<VideoJobData>) {
  const { generationJobId } = job.data;

  const genJob = await prisma.generationJob.findUnique({
    where: { id: generationJobId },
    include: {
      outfit: true,
      inputAsset: true,
    },
  });

  if (!genJob) throw new Error(`Job ${generationJobId} not found`);
  if (!genJob.inputAsset?.storageKey) throw new Error('No input frame asset');

  await prisma.generationJob.update({
    where: { id: generationJobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
  await publishJobStatus(generationJobId, 'RUNNING');

  try {
    const provider = getProvider(genJob.provider);
    const imageUrl = await storage.getSignedUrl(genJob.inputAsset.storageKey);

    let promptText: string;
    let promptJson: Record<string, unknown>;
    if (genJob.promptText) {
      promptText = genJob.promptText;
      promptJson = (genJob.promptJson as Record<string, unknown>) || {};
    } else {
      const preset = genJob.outfit.scenarioPresetId
        ? await findOutfitScenario(genJob.outfit.scenarioPresetId)
        : null;
      const resolved = resolveVideoPromptFromOutfitRow(genJob.outfit, { preset });
      promptText = resolved.promptText;
      promptJson = resolved.promptJson as unknown as Record<string, unknown>;
    }

    const result = await provider.generateVideoFromImage({
      prompt: promptText,
      inputImageUrl: imageUrl,
      durationSec: genJob.durationSec || genJob.outfit.durationSec || 6,
      resolution: genJob.resolution || genJob.outfit.resolution || '768p',
    });

    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        providerTaskId: result.taskId,
        promptText,
        promptJson: promptJson as never,
      },
    });

    await pollingQueue.add(
      'poll',
      {
        generationJobId,
        providerTaskId: result.taskId,
        provider: genJob.provider,
        attempt: 0,
      },
      {
        delay: 5000,
      },
    );

    await publishJobStatus(generationJobId, 'RUNNING', {
      message: 'Video task submitted, polling started',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: { status: 'FAILED', errorMessage: msg, finishedAt: new Date() },
    });
    await publishJobStatus(generationJobId, 'FAILED', { error: msg });
    throw error;
  }
}
