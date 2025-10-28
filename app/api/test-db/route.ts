import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Explicitly use Node.js runtime

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    runtime: 'nodejs',

    // Check all possible database environment variables
    envVars: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
      DIRECT_URL: !!process.env.DIRECT_URL,

      // Vercel Postgres specific variables
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_URL_prefix: process.env.POSTGRES_URL?.substring(0, 30) + '...',
      POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,

      // Other important vars
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      SERPER_API_KEY: !!process.env.SERPER_API_KEY,
      ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    },

    prismaAttempt: null as any,
    connectionTest: null as any,
    error: null as any
  }

  // Test 1: Try to connect with Prisma
  try {
    await prisma.$connect()
    diagnostics.prismaAttempt = 'SUCCESS: Connected to database'
  } catch (error) {
    diagnostics.prismaAttempt = 'FAILED'
    diagnostics.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
    }
  }

  // Test 2: Try a simple query
  if (diagnostics.prismaAttempt === 'SUCCESS: Connected to database') {
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`
      diagnostics.connectionTest = {
        status: 'SUCCESS',
        result: result
      }

      // Test 3: Try to count sources
      const sourceCount = await prisma.source.count()
      diagnostics.connectionTest.sourceCount = sourceCount

      // Test 4: Get table info
      const tables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `
      diagnostics.connectionTest.tables = tables

    } catch (error) {
      diagnostics.connectionTest = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Disconnect
  try {
    await prisma.$disconnect()
  } catch (e) {
    // Ignore disconnect errors
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  })
}
