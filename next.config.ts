import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma engine files are included in the serverless function output
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/libquery_engine-*', './node_modules/@prisma/client/**/*']
  }
};

export default nextConfig;
