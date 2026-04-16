import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { z } from "zod";
import { prisma } from "@ai-magic/db";
import { ok, fail } from "@ai-magic/shared";
import { signToken, setAuthCookie } from "@/lib/auth";
import type { UserRole } from "@ai-magic/shared";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        fail("INVALID_INPUT", "请输入有效的邮箱和密码"),
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(fail("UNAUTHORIZED", "邮箱或密码错误"), {
        status: 401,
      });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(fail("UNAUTHORIZED", "邮箱或密码错误"), {
        status: 401,
      });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    await setAuthCookie(token);

    return NextResponse.json(
      ok({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }),
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(fail("INTERNAL_ERROR", "服务器错误"), {
      status: 500,
    });
  }
}
