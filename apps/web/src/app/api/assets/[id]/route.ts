import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-magic/db';
import { ok, fail } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        jobOutputRefs: {
          include: {
            outfit: { select: { id: true, title: true } },
            costs: true,
          },
        },
        reviews: {
          include: { reviewer: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(fail('NOT_FOUND', '资产不存在'), { status: 404 });
    }

    return NextResponse.json(ok(asset));
  } catch (error) {
    return handleApiError(error);
  }
}
