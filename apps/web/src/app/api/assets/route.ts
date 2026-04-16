import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-magic/db';
import { paginated } from '@ai-magic/shared';
import { paginationSchema } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const { page, pageSize } = paginationSchema.parse({
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
    });

    const where: Record<string, unknown> = {};
    const type = url.searchParams.get('type');
    if (type) where.type = type;
    const reviewStatus = url.searchParams.get('reviewStatus');
    if (reviewStatus) where.reviewStatus = reviewStatus;
    const provider = url.searchParams.get('provider');
    if (provider) where.provider = provider;

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          jobOutputRefs: {
            select: { id: true, outfitId: true, stage: true, model: true, promptText: true, seed: true },
            take: 1,
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json(paginated(items, total, page, pageSize));
  } catch (error) {
    return handleApiError(error);
  }
}
