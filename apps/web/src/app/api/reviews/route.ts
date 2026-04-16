import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@ai-magic/db';
import { ok, paginated, fail } from '@ai-magic/shared';
import { paginationSchema } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';

const createSchema = z.object({
  assetId: z.string().optional(),
  outfitId: z.string().optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'ARCHIVED']),
  comment: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const { page, pageSize } = paginationSchema.parse({
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
    });

    const [items, total] = await Promise.all([
      prisma.reviewRecord.findMany({
        include: {
          asset: { select: { id: true, type: true, storageKey: true, reviewStatus: true } },
          outfit: { select: { id: true, title: true } },
          reviewer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.reviewRecord.count(),
    ]);

    return NextResponse.json(paginated(items, total, page, pageSize));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('INVALID_INPUT', parsed.error.issues[0].message), { status: 400 });
    }

    const { assetId, outfitId, status, comment } = parsed.data;

    const review = await prisma.reviewRecord.create({
      data: {
        assetId,
        outfitId,
        reviewerId: user.userId,
        status,
        comment,
      },
    });

    if (assetId) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { reviewStatus: status },
      });
    }

    if (outfitId) {
      await prisma.outfit.update({
        where: { id: outfitId },
        data: { status },
      });
    }

    return NextResponse.json(ok(review), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
