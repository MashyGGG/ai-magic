import { NextResponse } from "next/server";
import { prisma } from "@ai-magic/db";
import { ok } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireUser();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      todayJobs,
      todaySuccess,
      todayCosts,
      recentOutfits,
      pendingReviewAssets,
    ] = await Promise.all([
      prisma.generationJob.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.generationJob.count({
        where: { createdAt: { gte: todayStart }, status: "SUCCEEDED" },
      }),
      prisma.costLedger.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { amount: true },
      }),
      prisma.outfit.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      prisma.asset.findMany({
        where: { reviewStatus: { in: ["GENERATED", "REVIEWING"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, reviewStatus: true, createdAt: true },
      }),
    ]);

    const todayCostTotal = todayCosts.reduce(
      (s: number, c: { amount: string }) => s + Number(c.amount),
      0,
    );

    return NextResponse.json(
      ok({
        todayGenCount: todayJobs,
        todaySuccessRate:
          todayJobs > 0 ? ((todaySuccess / todayJobs) * 100).toFixed(1) : "0",
        todayCost: todayCostTotal,
        recentOutfits,
        pendingReviewAssets,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
