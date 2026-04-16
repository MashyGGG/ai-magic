import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@ai-magic/db';
import { ok, fail } from '@ai-magic/shared';
import { requireUser, handleApiError } from '@/lib/api-utils';

const schema = z.object({
  outfitId: z.string().min(1),
  selected: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('INVALID_INPUT', parsed.error.issues[0].message), { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json(fail('NOT_FOUND', '资产不存在'), { status: 404 });
    }

    await prisma.asset.update({
      where: { id },
      data: { isSelectedFrame: parsed.data.selected },
    });

    return NextResponse.json(ok({ updated: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
