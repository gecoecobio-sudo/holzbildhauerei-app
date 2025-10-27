import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get all sources
    const sources = await prisma.source.findMany({
      select: {
        id: true,
        title: true,
        url: true,
        category: true,
        summary_de: true,
        tags: true,
        relevance_score: true,
        corrected_score: true
      },
      orderBy: { relevance_score: 'desc' }
    })

    // Parse tags and group by tag
    const tagMap: Map<string, Array<any>> = new Map()

    sources.forEach(source => {
      const tags = typeof source.tags === 'string' ? JSON.parse(source.tags) : source.tags
      const displayScore = source.corrected_score || source.relevance_score

      tags.forEach((tag: string) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, [])
        }
        tagMap.get(tag)!.push({
          id: source.id,
          title: source.title,
          url: source.url,
          category: source.category,
          summary_de: source.summary_de,
          relevance_score: displayScore
        })
      })
    })

    // Convert to array and sort by count
    const tagStats = Array.from(tagMap.entries()).map(([tag, sources]) => ({
      tag,
      count: sources.length,
      sources: sources.sort((a, b) => b.relevance_score - a.relevance_score)
    })).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      totalTags: tagStats.length,
      totalSources: sources.length,
      tags: tagStats
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Tags' },
      { status: 500 }
    )
  }
}
