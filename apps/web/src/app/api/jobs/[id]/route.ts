import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-magic/db";
import { ok, fail } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;

    const job = await prisma.generationJob.findUnique({
      where: { id },
      include: {
        outputAsset: { select: { id: true, storageKey: true, type: true } },
        inputAsset: { select: { id: true, storageKey: true, type: true } },
        costs: true,
      },
    });

    if (!job) {
      return NextResponse.json(fail("NOT_FOUND", "任务不存在"), {
        status: 404,
      });
    }

    return NextResponse.json(ok(job));
  } catch (error) {
    return handleApiError(error);
  }
}
