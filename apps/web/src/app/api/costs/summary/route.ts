import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-magic/db";
import { ok } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from)
        (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const costs = await prisma.costLedger.findMany({ where });

    const totalAmount = costs.reduce(
      (s: number, c: { amount: string }) => s + Number(c.amount),
      0,
    );

    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    for (const c of costs) {
      byProvider[c.provider] = (byProvider[c.provider] || 0) + Number(c.amount);
      byModel[c.model] = (byModel[c.model] || 0) + Number(c.amount);
    }

    const jobCount = await prisma.generationJob.count({
      where: where.createdAt ? { createdAt: where.createdAt as object } : {},
    });
    const successCount = await prisma.generationJob.count({
      where: {
        status: "SUCCEEDED",
        ...(where.createdAt ? { createdAt: where.createdAt as object } : {}),
      },
    });
    const failedCount = await prisma.generationJob.count({
      where: {
        status: { in: ["FAILED", "DOWNLOAD_FAILED"] },
        ...(where.createdAt ? { createdAt: where.createdAt as object } : {}),
      },
    });

    return NextResponse.json(
      ok({
        totalAmount,
        byProvider,
        byModel,
        jobCount,
        successCount,
        failedCount,
        successRate:
          jobCount > 0 ? ((successCount / jobCount) * 100).toFixed(1) : "0",
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
