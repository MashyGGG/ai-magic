import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { fail, type ApiResponse } from '@ai-magic/shared';
import { AppError } from '@ai-magic/shared';
import type { UserRole } from '@ai-magic/shared';
import { getCurrentUser } from '@/lib/auth';

export interface RequestUser {
  userId: string;
  role: UserRole;
  email: string;
}

/**
 * Resolve the current user for Route Handlers.
 * - Prefer `x-user-*` headers when present (set by `proxy` for `/app/*` document requests).
 * - Otherwise fall back to the HttpOnly JWT cookie, because client `fetch`/`axios` calls
 *   to `/api/*` do not go through the `/app` matcher and never receive injected headers.
 */
export async function getRequestUser(): Promise<RequestUser | null> {
  const h = await headers();
  const userId = h.get('x-user-id');
  const role = h.get('x-user-role') as UserRole | null;
  const email = h.get('x-user-email');
  if (userId && role && email) {
    return { userId, role, email };
  }

  const payload = await getCurrentUser();
  if (!payload) return null;
  return { userId: payload.userId, role: payload.role, email: payload.email };
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
