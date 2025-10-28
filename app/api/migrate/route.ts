import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create tables with raw SQL
    const results = []

    // Create sources table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "sources" (
        "id" SERIAL PRIMARY KEY,
        "url" TEXT UNIQUE NOT NULL,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "summary_de" TEXT NOT NULL,
        "tags" TEXT NOT NULL,
        "language" TEXT DEFAULT 'Deutsch' NOT NULL,
        "date_added" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "source_query" TEXT,
        "relevance_score" INTEGER DEFAULT 5 NOT NULL,
        "corrected_score" INTEGER,
        "star_rating" BOOLEAN DEFAULT false NOT NULL,
        "last_updated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `)
    results.push('sources table created')

    // Create indexes for sources
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sources_url_idx" ON "sources"("url")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sources_language_idx" ON "sources"("language")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "sources_star_rating_idx" ON "sources"("star_rating")
    `)
    results.push('sources indexes created')

    // Create search_queue table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "search_queue" (
        "id" SERIAL PRIMARY KEY,
        "query" TEXT NOT NULL,
        "status" TEXT DEFAULT 'pending' NOT NULL,
        "date_added" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "date_processed" TIMESTAMP,
        "error_message" TEXT,
        "results_count" INTEGER DEFAULT 0 NOT NULL,
        "is_ai_generated" BOOLEAN DEFAULT false NOT NULL
      )
    `)
    results.push('search_queue table created')

    // Create index for search_queue
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "search_queue_status_idx" ON "search_queue"("status")
    `)
    results.push('search_queue index created')

    // Create tag_cooccurrence table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "tag_cooccurrence" (
        "id" SERIAL PRIMARY KEY,
        "tag1" TEXT NOT NULL,
        "tag2" TEXT NOT NULL,
        "count" INTEGER DEFAULT 1 NOT NULL,
        "last_updated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE("tag1", "tag2")
      )
    `)
    results.push('tag_cooccurrence table created')

    // Create indexes for tag_cooccurrence
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "tag_cooccurrence_tag1_idx" ON "tag_cooccurrence"("tag1")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "tag_cooccurrence_tag2_idx" ON "tag_cooccurrence"("tag2")
    `)
    results.push('tag_cooccurrence indexes created')

    return NextResponse.json({
      success: true,
      message: 'Tables created successfully',
      results
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
