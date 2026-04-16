import { Job } from 'bullmq';
import { prisma } from '@ai-magic/db';
import { getProvider } from '@ai-magic/providers';
import { buildImagePrompt } from '@ai-magic/prompts';
import { storage } from '../lib/storage';
import { publishJobStatus } from '../lib/publish';
import { randomUUID } from 'crypto';

interface ImageJobData {
  generationJobId: string;
}

export async function processImageGeneration(job: Job<ImageJobData>) {
  const { generationJobId } = job.data;

  const genJob = await prisma.generationJob.findUnique({
    where: { id: generationJobId },
    include: {
      outfit: { include: { characterTemplate: true } },
    },
  });

  if (!genJob) throw new Error(`Job ${generationJobId} not found`);

  await prisma.generationJob.update({
    where: { id: generationJobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
  await publishJobStatus(generationJobId, 'RUNNING');

  try {
    const provider = getProvider(genJob.provider);
    const template = genJob.outfit.characterTemplate;

    const promptResult = genJob.promptText
      ? { text: genJob.promptText, json: genJob.promptJson as Record<string, string> || {} }
      : buildImagePrompt({
          character: {
            genderStyle: template.genderStyle || undefined,
            ageStyle: template.ageStyle || undefined,
            faceDesc: template.faceDesc || undefined,
            hairDesc: template.hairDesc || undefined,
            skinDesc: template.skinDesc || undefined,
            bodyDesc: template.bodyDesc || undefined,
            vibeDesc: template.vibeDesc || undefined,
          },
          outfit: {
            topDesc: genJob.outfit.topDesc || undefined,
            bottomDesc: genJob.outfit.bottomDesc || undefined,
            shoesDesc: genJob.outfit.shoesDesc || undefined,
            bagDesc: genJob.outfit.bagDesc || undefined,
            accessoriesDesc: genJob.outfit.accessoriesDesc || undefined,
            materialDesc: genJob.outfit.materialDesc || undefined,
            colorDesc: genJob.outfit.colorDesc || undefined,
          },
          cameraId: genJob.outfit.cameraTemplate || undefined,
          sceneId: genJob.outfit.sceneDesc || undefined,
          backgroundDesc: genJob.outfit.backgroundDesc || undefined,
        });

    const subjectRefs: string[] = [];
    if (template.referenceAssetId) {
      const refAsset = await prisma.asset.findUnique({ where: { id: template.referenceAssetId } });
      if (refAsset?.storageKey) {
        const url = await storage.getSignedUrl(refAsset.storageKey);
        subjectRefs.push(url);
      }
    }

    const result = await provider.generateImages({
      prompt: promptResult.text,
      promptJson: promptResult.json,
      count: 1,
      aspectRatio: genJob.outfit.aspectRatio || '9:16',
      resolution: genJob.resolution || undefined,
      seed: genJob.seed || undefined,
      subjectReferenceUrls: subjectRefs.length > 0 ? subjectRefs : undefined,
    });

    if (!result.success || result.items.length === 0) {
      throw new Error('No images generated');
    }

    const img = result.items[0];

    let buffer: Buffer;
    if (img.url) {
      const res = await fetch(img.url);
      buffer = Buffer.from(await res.arrayBuffer());
    } else if (img.base64) {
      buffer = Buffer.from(img.base64, 'base64');
    } else {
      throw new Error('No image data in response');
    }

    const storageKey = `images/${randomUUID()}.png`;
    await storage.put(storageKey, buffer, 'image/png');

    const asset = await prisma.asset.create({
      data: {
        type: 'IMAGE',
        mimeType: 'image/png',
        width: img.width,
        height: img.height,
        provider: genJob.provider,
        providerUrl: img.url,
        storageBucket: process.env.S3_BUCKET || 'ai-magic',
        storageKey,
        fileSize: buffer.length,
        metadataJson: img.metadata || {},
      },
    });

    const costEst = provider.estimateCost({
      stage: 'IMAGE',
      model: genJob.model,
      count: 1,
      resolution: genJob.resolution || undefined,
    });

    await prisma.costLedger.create({
      data: {
        generationJobId,
        provider: genJob.provider,
        model: genJob.model,
        currency: costEst.currency,
        amount: costEst.amount,
        billingUnit: 'PER_IMAGE',
        rawBillingJson: result.raw as object || {},
      },
    });

    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: 'SUCCEEDED',
        outputAssetId: asset.id,
        promptText: promptResult.text,
        promptJson: promptResult.json,
        seed: img.seed || genJob.seed,
        finishedAt: new Date(),
      },
    });

    await publishJobStatus(generationJobId, 'SUCCEEDED', { assetId: asset.id });
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
