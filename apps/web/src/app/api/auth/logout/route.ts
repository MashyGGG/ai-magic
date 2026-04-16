import { NextResponse } from "next/server";
import { ok } from "@ai-magic/shared";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json(ok({ message: "已退出登录" }));
}
