import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@ai-magic/db';
import { MiniMaxProvider, registerProvider } from '@ai-magic/providers';
import { processImageGeneration } from './processors/image-generation';
import { processVideoGeneration } from './processors/video-generation';
import { processPolling } from './processors/polling';
import { processAssetDownload } from './processors/asset-download';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

registerProvider(new MiniMaxProvider());

const workers = [
  new Worker('image-generation', processImageGeneration, {
    connection,
    concurrency: 4,
  }),
  new Worker('video-generation', processVideoGeneration, {
    connection,
    concurrency: 2,
  }),
  new Worker('task-polling', processPolling, {
    connection,
    concurrency: 4,
  }),
  new Worker('asset-download', processAssetDownload, {
    connection,
    concurrency: 4,
  }),
];

for (const w of workers) {
  w.on('completed', (job) => {
    console.log(`[${w.name}] Job ${job.id} completed`);
  });
  w.on('failed', (job, err) => {
    console.error(`[${w.name}] Job ${job?.id} failed:`, err.message);
  });
}

console.log('Worker started with queues: image-generation, video-generation, task-polling, asset-download');

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();
  await connection.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
