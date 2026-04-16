import Redis from "ioredis";

const pub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function publishJobStatus(
  jobId: string,
  status: string,
  data?: Record<string, unknown>,
) {
  await pub.publish(
    `job:${jobId}:status`,
    JSON.stringify({ status, ...data, timestamp: Date.now() }),
  );
}
