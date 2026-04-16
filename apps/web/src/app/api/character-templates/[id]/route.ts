import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-magic/db";
import { ok, fail } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  genderStyle: z.string().optional(),
  ageStyle: z.string().optional(),
  faceDesc: z.string().optional(),
  hairDesc: z.string().optional(),
  skinDesc: z.string().optional(),
  bodyDesc: z.string().optional(),
  vibeDesc: z.string().optional(),
  defaultScene: z.string().optional(),
  defaultCamera: z.string().optional(),
  defaultMotion: z.string().optional(),
  referenceAssetId: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;

    const template = await prisma.characterTemplate.findUnique({
      where: { id },
      include: {
        referenceAsset: {
          select: { id: true, storageKey: true, mimeType: true },
        },
        outfits: {
          select: { id: true, title: true, status: true, createdAt: true },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json(fail("NOT_FOUND", "模板不存在"), {
        status: 404,
      });
    }

    return NextResponse.json(ok(template));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        fail("INVALID_INPUT", parsed.error.issues[0].message),
        { status: 400 },
      );
    }

    const template = await prisma.characterTemplate.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(ok(template));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await params;

    const outfitCount = await prisma.outfit.count({
      where: { characterTemplateId: id },
    });

    if (outfitCount > 0) {
      return NextResponse.json(
        fail(
          "TEMPLATE_IN_USE",
          `该模板被 ${outfitCount} 个穿搭任务引用，无法删除`,
        ),
        { status: 409 },
      );
    }

    await prisma.characterTemplate.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
