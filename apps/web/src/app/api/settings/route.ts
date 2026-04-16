import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-magic/db";
import { ok, fail } from "@ai-magic/shared";
import { requireRole, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireRole(["ADMIN"]);

    const settings = await prisma.systemSetting.findMany();
    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return NextResponse.json(ok(result));
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.record(z.string(), z.unknown());

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail("INVALID_INPUT", "无效的设置数据"), {
        status: 400,
      });
    }

    for (const [key, value] of Object.entries(parsed.data)) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: value as object },
        update: { value: value as object },
      });
    }

    return NextResponse.json(ok({ updated: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
