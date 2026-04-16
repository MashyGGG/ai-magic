import type { NextConfig } from "next";
import path from "path";

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
