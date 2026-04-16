import type { NextConfig } from "next";
import fs from "node:fs";
import path from "path";

function loadRepoRootEnv() {
  // Next.js loads env files from the app directory (`apps/web`) by default.
  // This repo keeps env in the workspace root (`.env`), so we proactively load it
  // to make Prisma available in server routes.
  if (process.env.DATABASE_URL && process.env.REDIS_URL) return;

  const envPath = path.resolve(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRepoRootEnv();

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-magic/shared",
    "@ai-magic/db",
    "@ai-magic/providers",
    "@ai-magic/prompts",
  ],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
  },
};

export default nextConfig;
