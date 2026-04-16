import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@ai-magic/db";
import { getProvider } from "@ai-magic/providers";
import { publishJobStatus } from "../lib/publish";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);
const pollingQueue = new Queue("task-polling", { connection });
const downloadQueue = new Queue("asset-download", { connection });

const MAX_POLL_ATTEMPTS = 120;

interface PollJobData {
  generationJobId: string;
  providerTaskId: string;
  provider: string;
  attempt: number;
}

export async function processPolling(job: Job<PollJobData>) {
  const {
    generationJobId,
    providerTaskId,
    provider: providerName,
    attempt,
  } = job.data;

  const provider = getProvider(providerName);
  const result = await provider.getTask(providerTaskId);

  if (result.status === "SUCCEEDED") {
    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        providerFileId: result.providerFileId,
      },
    });

    await downloadQueue.add("download", {
      generationJobId,
      providerFileId: result.providerFileId,
      outputUrl: result.outputUrl,
      provider: providerName,
    });

    await publishJobStatus(generationJobId, "RUNNING", {
      message: "Downloading video...",
    });
    return;
  }

  if (result.status === "FAILED" || result.status === "CANCELED") {
    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: "FAILED",
        errorMessage: result.errorMessage || "Provider task failed",
        finishedAt: new Date(),
      },
    });
    await publishJobStatus(generationJobId, "FAILED", {
      error: result.errorMessage,
    });
    return;
  }

  if (attempt >= MAX_POLL_ATTEMPTS) {
    await prisma.generationJob.update({
      where: { id: generationJobId },
      data: {
        status: "FAILED",
        errorMessage: "Polling timeout",
        finishedAt: new Date(),
      },
    });
    await publishJobStatus(generationJobId, "FAILED", {
      error: "Polling timeout",
    });
    return;
  }

  const jitter = Math.random() * 2000;
  const delay =
    Math.min(5000 * Math.pow(1.5, Math.min(attempt, 10)), 60000) + jitter;

  await pollingQueue.add(
    "poll",
    {
      generationJobId,
      providerTaskId,
      provider: providerName,
      attempt: attempt + 1,
    },
    { delay },
  );
}
