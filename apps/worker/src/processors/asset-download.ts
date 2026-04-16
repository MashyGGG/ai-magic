import { Job } from "bullmq";
import { prisma } from "@ai-magic/db";
import { getProvider } from "@ai-magic/providers";
import { storage } from "../lib/storage";
import { publishJobStatus } from "../lib/publish";
import { randomUUID } from "crypto";

interface DownloadJobData {
  generationJobId: string;
  providerFileId?: string;
  outputUrl?: string;
  provider: string;
}

export async function processAssetDownload(job: Job<DownloadJobData>) {
  const {
    generationJobId,
    providerFileId,
    outputUrl,
    provider: providerName,
  } = job.data;

  try {
    const genJob = await prisma.generationJob.findUnique({
      where: { id: generationJobId },
    });
    if (!genJob) throw new Error(`Job ${generationJobId} not found`);

    const provider = getProvider(providerName);
    const result = await provider.downloadAsset({
      fileId: providerFileId,
      url: outputUrl,
    });

    const ext = result.mimeType?.includes("mp4") ? "mp4" : "mp4";
    const storageKey = `videos/${randomUUID()}.${ext}`;
    await storage.put(
      storageKey,
      result.buffer,
      result.mimeType || "video/mp4",
    );

    const asset = await prisma.asset.create({
      data: {
        type: "VIDEO",
        mimeType: result.mimeType || "video/mp4",
        provider: genJob.provider,
        providerFileId: providerFileId,
        storageBucket: process.env.S3_BUCKET || "ai-magic",
        storageKey,
        fileSize: result.buffer.length,
      },
    });

    const costEst = provider.estimateCost({
      stage: "VIDEO",
      model: genJob.model,
      count: 1,
      resolution: genJob.resolution || undefined,
      durationSec: genJob.durationSec || 6,
    });

    await prisma.costLedger.create({
      data: {
        generationJobId,
        provider: genJob.provider,
        model: genJob.model,
        currency: costEst.currency,
        amount: costEst.amount,
        billingUnit: "PER_SECOND",
        rawBillingJson: {},
      },
    });

    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: "SUCCEEDED",
        outputAssetId: asset.id,
        finishedAt: new Date(),
      },
    });

    await publishJobStatus(generationJobId, "SUCCEEDED", { assetId: asset.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Download failed";
    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: "DOWNLOAD_FAILED",
        errorMessage: msg,
        finishedAt: new Date(),
      },
    });
    await publishJobStatus(generationJobId, "DOWNLOAD_FAILED", { error: msg });
    throw error;
  }
}
