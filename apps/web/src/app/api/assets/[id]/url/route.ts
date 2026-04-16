import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ai-magic/db';
import { storage } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { storageKey: true },
    });

    if (!asset?.storageKey) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const url = await storage.getSignedUrl(asset.storageKey, 3600);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Failed to get URL' }, { status: 500 });
  }
}
