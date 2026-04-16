import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { fail, type ApiResponse } from '@ai-magic/shared';
import { AppError } from '@ai-magic/shared';
import type { UserRole } from '@ai-magic/shared';

export interface RequestUser {
  userId: string;
  role: UserRole;
  email: string;
}

export async function getRequestUser(): Promise<RequestUser | null> {
  const h = await headers();
  const userId = h.get('x-user-id');
  const role = h.get('x-user-role') as UserRole | null;
  const email = h.get('x-user-email');
  if (!userId || !role || !email) return null;
  return { userId, role, email };
}

export async function requireUser(): Promise<RequestUser> {
  const user = await getRequestUser();
  if (!user) {
    throw new AppError('UNAUTHORIZED', '未登录', 401);
  }
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<RequestUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AppError('FORBIDDEN', '权限不足', 403);
  }
  return user;
}

export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof AppError) {
    return NextResponse.json(fail(error.code, error.message), { status: error.statusCode });
  }
  console.error('Unhandled API error:', error);
  return NextResponse.json(fail('INTERNAL_ERROR', '服务器错误'), { status: 500 });
}
