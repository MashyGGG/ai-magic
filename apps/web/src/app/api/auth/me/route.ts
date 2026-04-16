import { NextResponse } from 'next/server';
import { ok, fail } from '@ai-magic/shared';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@ai-magic/db';

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(fail('UNAUTHORIZED', '未登录'), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.json(fail('NOT_FOUND', '用户不存在'), { status: 404 });
  }

  return NextResponse.json(ok(user));
}
