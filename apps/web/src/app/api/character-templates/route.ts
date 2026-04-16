import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-magic/db";
import { ok, paginated, fail } from "@ai-magic/shared";
import { paginationSchema } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";

const createSchema = z.object({
  name: z.string().min(1, "模板名称不能为空"),
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
  referenceAssetId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const { page, pageSize } = paginationSchema.parse({
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
    });
    const keyword = url.searchParams.get("keyword") || "";

    const where = keyword
      ? { name: { contains: keyword, mode: "insensitive" as const } }
      : {};

    const [items, total] = await Promise.all([
      prisma.characterTemplate.findMany({
        where,
        include: {
          referenceAsset: {
            select: { id: true, storageKey: true, mimeType: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.characterTemplate.count({ where }),
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
      return NextResponse.json(
        fail("INVALID_INPUT", parsed.error.issues[0].message),
        { status: 400 },
      );
    }

    const template = await prisma.characterTemplate.create({
      data: {
        ...parsed.data,
        createdById: user.userId,
      },
    });

    return NextResponse.json(ok(template), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
