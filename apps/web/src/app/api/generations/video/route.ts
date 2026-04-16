import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Queue } from "bullmq";
import { prisma } from "@ai-magic/db";
import { ok, fail } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";
import { redis } from "@/lib/redis";

const queue = new Queue("video-generation", { connection: redis });

const schema = z.object({
  outfitId: z.string().min(1),
  inputAssetId: z.string().min(1),
  provider: z
    .enum(["MINIMAX", "RUNWAY", "JIMENG", "OPENAI"])
    .default("MINIMAX"),
  model: z.string().default("Hailuo-2.3-Fast"),
  count: z.number().int().min(1).max(4).default(2),
  durationSec: z.number().int().min(2).max(10).default(6),
  resolution: z.string().default("768p"),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        fail("INVALID_INPUT", parsed.error.issues[0].message),
        { status: 400 },
      );
    }

    const {
      outfitId,
      inputAssetId,
      provider,
      model,
      count,
      durationSec,
      resolution,
    } = parsed.data;

    const asset = await prisma.asset.findUnique({
      where: { id: inputAssetId },
    });
    if (!asset || !asset.isSelectedFrame) {
      return NextResponse.json(fail("INVALID_INPUT", "请先选择一张首帧图"), {
        status: 400,
      });
    }

    const jobIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const genJob = await prisma.generationJob.create({
        data: {
          outfitId,
          stage: "VIDEO",
          provider,
          model,
          inputAssetId,
          status: "QUEUED",
          candidateIndex: i,
          durationSec,
          resolution,
        },
      });

      await queue.add("generate-video", { generationJobId: genJob.id });
      jobIds.push(genJob.id);
    }

    return NextResponse.json(ok({ jobIds }));
  } catch (error) {
    return handleApiError(error);
  }
}
