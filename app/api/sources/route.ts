import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const language = searchParams.get('language') || ''
    const tag = searchParams.get('tag') || ''
    const minScore = parseInt(searchParams.get('minScore') || '0')
    const starredOnly = searchParams.get('starredOnly') === 'true'

    // Build where clause
    const where: any = {}

    if (starredOnly) {
      where.star_rating = true
    }

    if (category) {
      where.category = category
    }

    if (language) {
      where.language = language
    }

    // Get all sources first
    let sources = await prisma.source.findMany({
      where,
      orderBy: {
        date_added: 'desc'
      }
    })

    // Parse tags from JSON strings
    sources = sources.map(source => ({
      ...source,
      tags: JSON.parse(source.tags)
    }))

    // Apply search filter (client-side since SQLite doesn't have great JSON support)
    if (search) {
      const searchLower = search.toLowerCase()
      sources = sources.filter(s =>
        s.title.toLowerCase().includes(searchLower) ||
        s.url.toLowerCase().includes(searchLower) ||
        s.summary_de.toLowerCase().includes(searchLower) ||
        s.tags.some((t: string) => t.toLowerCase().includes(searchLower))
      )
    }

    // Apply tag filter
    if (tag) {
      sources = sources.filter(s => s.tags.includes(tag))
    }

    // Apply score filter (use corrected_score if available, else relevance_score)
    if (minScore > 0) {
      sources = sources.filter(s => (s.corrected_score || s.relevance_score) >= minScore)
    }

    return NextResponse.json({
      sources,
      total: sources.length
    })
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
