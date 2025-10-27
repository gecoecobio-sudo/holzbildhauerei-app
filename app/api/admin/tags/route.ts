import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getRelatedTags } from '@/lib/cooccurrence'

export async function GET(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all sources and their tags
    const sources = await prisma.source.findMany({
      select: { tags: true }
    })

    // Count tag occurrences
    const tagCounts: Record<string, number> = {}
    sources.forEach(source => {
      const tags = typeof source.tags === 'string' ? JSON.parse(source.tags) : source.tags
      tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    // Convert to array and sort by count
    const tagStats = Object.entries(tagCounts).map(([tag, count]) => ({
      tag,
      count
    })).sort((a, b) => b.count - a.count)

    // Get related tags for each tag (top 10)
    const tagsWithRelations = await Promise.all(
      tagStats.map(async (tagStat) => {
        const relatedTags = await getRelatedTags(tagStat.tag, 10)
        return {
          ...tagStat,
          relatedTags
        }
      })
    )

    return NextResponse.json({
      totalTags: tagStats.length,
      totalSources: sources.length,
      tags: tagsWithRelations
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Tags' },
      { status: 500 }
    )
  }
}
