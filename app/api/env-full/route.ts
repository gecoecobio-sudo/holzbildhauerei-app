import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Show ALL database-related environment variables with masked passwords
  const maskPassword = (url: string) => {
    if (!url) return 'NOT_SET'
    try {
      const urlObj = new URL(url)
      if (urlObj.password) {
        return url.replace(urlObj.password, '***MASKED***')
      }
      return url
    } catch {
      return url.substring(0, 50) + '...'
    }
  }

  const envInfo = {
    // All possible Postgres variables
    DATABASE_URL: maskPassword(process.env.DATABASE_URL || ''),
    DIRECT_URL: maskPassword(process.env.DIRECT_URL || ''),

    // Vercel Postgres variables (auto-set by Vercel)
    POSTGRES_URL: maskPassword(process.env.POSTGRES_URL || ''),
    POSTGRES_PRISMA_URL: maskPassword(process.env.POSTGRES_PRISMA_URL || ''),
    POSTGRES_URL_NON_POOLING: maskPassword(process.env.POSTGRES_URL_NON_POOLING || ''),
    POSTGRES_URL_NO_SSL: maskPassword(process.env.POSTGRES_URL_NO_SSL || ''),
    POSTGRES_USER: process.env.POSTGRES_USER || 'NOT_SET',
    POSTGRES_HOST: process.env.POSTGRES_HOST || 'NOT_SET',
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || 'NOT_SET',

    // Check which one Prisma is actually using
    prismaWillUse: maskPassword(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || ''),

    // Other env info
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }

  return NextResponse.json(envInfo, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}
