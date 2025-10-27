import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateTagCooccurrences } from '@/lib/cooccurrence'

export async function GET(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '200')
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const starredOnly = searchParams.get('starred') === 'true'

  const skip = (page - 1) * limit

  const where: any = {}
  if (category) where.category = category
  if (starredOnly) where.star_rating = true

  const [sources, total] = await Promise.all([
    prisma.source.findMany({
      where,
      orderBy: { date_added: 'desc' },
      skip,
      take: limit
    }),
    prisma.source.count({ where })
  ])

  // Parse tags
  const parsedSources = sources.map(s => ({
    ...s,
    tags: typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags
  }))

  // Filter by search on client side (since tags need parsing)
  let filtered = parsedSources
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = parsedSources.filter(s =>
      s.title.toLowerCase().includes(searchLower) ||
      s.summary_de.toLowerCase().includes(searchLower) ||
      s.url.toLowerCase().includes(searchLower) ||
      s.tags.some((t: string) => t.toLowerCase().includes(searchLower))
    )
  }

  return NextResponse.json({
    sources: filtered,
    total: search ? filtered.length : total,
    page,
    limit,
    totalPages: Math.ceil((search ? filtered.length : total) / limit)
  })
}

export async function POST(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      url,
      title,
      category,
      summary_de,
      tags,
      language,
      relevance_score,
      source_query,
      star_rating
    } = body

    // Check if URL already exists
    const existing = await prisma.source.findUnique({ where: { url } })
    if (existing) {
      return NextResponse.json(
        { error: 'Diese URL existiert bereits' },
        { status: 400 }
      )
    }

    const source = await prisma.source.create({
      data: {
        url,
        title,
        category,
        summary_de,
        tags: JSON.stringify(tags),
        language: language || 'Deutsch',
        relevance_score: relevance_score || 5,
        source_query: source_query || null,
        star_rating: star_rating || false
      }
    })

    // Update tag co-occurrences for similarity analysis
    if (tags && Array.isArray(tags)) {
      await updateTagCooccurrences(tags)
    }

    return NextResponse.json({
      ...source,
      tags: JSON.parse(source.tags)
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete all sources
    const result = await prisma.source.deleteMany({})

    // Also clear tag co-occurrences
    await prisma.tagCooccurrence.deleteMany({})

    return NextResponse.json({
      success: true,
      deletedCount: result.count
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen' },
      { status: 500 }
    )
  }
}
