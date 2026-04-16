import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-magic/db";
import { ok, fail } from "@ai-magic/shared";
import { requireUser, handleApiError } from "@/lib/api-utils";
import { storage } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(fail("INVALID_INPUT", "请选择文件"), {
        status: 400,
      });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(fail("INVALID_INPUT", "文件大小不能超过 10MB"), {
        status: 400,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const key = `uploads/${randomUUID()}.${ext}`;

    await storage.put(key, buffer, file.type);

    const asset = await prisma.asset.create({
      data: {
        type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        mimeType: file.type,
        fileSize: file.size,
        storageBucket: process.env.S3_BUCKET || "ai-magic",
        storageKey: key,
        reviewStatus: "GENERATED",
      },
    });

    return NextResponse.json(ok({ assetId: asset.id, storageKey: key }));
  } catch (error) {
    return handleApiError(error);
  }
}
