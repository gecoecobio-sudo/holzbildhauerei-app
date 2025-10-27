import { prisma } from './db'

/**
 * Update tag co-occurrences for a source
 * This should be called when a source is created or updated
 */
export async function updateTagCooccurrences(tags: string[]) {
  if (tags.length < 2) return

  // Generate all pairs of tags
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      // Sort alphabetically to ensure consistency (tag1, tag2)
      const [tag1, tag2] = [tags[i], tags[j]].sort()
      pairs.push([tag1, tag2])
    }
  }

  // Update or create co-occurrence records
  for (const [tag1, tag2] of pairs) {
    try {
      await prisma.tagCooccurrence.upsert({
        where: {
          tag1_tag2: { tag1, tag2 }
        },
        update: {
          count: { increment: 1 },
          last_updated: new Date()
        },
        create: {
          tag1,
          tag2,
          count: 1
        }
      })
    } catch (error) {
      console.error('Failed to update tag co-occurrence:', error)
    }
  }
}

/**
 * Get related tags based on co-occurrence
 * Returns tags that frequently appear with the given tag
 */
export async function getRelatedTags(tag: string, limit: number = 10): Promise<Array<{ tag: string; score: number }>> {
  try {
    // Find all co-occurrences where this tag appears
    const cooccurrences = await prisma.tagCooccurrence.findMany({
      where: {
        OR: [
          { tag1: tag },
          { tag2: tag }
        ]
      },
      orderBy: {
        count: 'desc'
      },
      take: limit
    })

    // Extract the related tags and their scores
    const relatedTags = cooccurrences.map(co => ({
      tag: co.tag1 === tag ? co.tag2 : co.tag1,
      score: co.count
    }))

    return relatedTags
  } catch (error) {
    console.error('Failed to get related tags:', error)
    return []
  }
}

/**
 * Find similar sources based on tag overlap
 * Uses co-occurrence scores to rank similarity
 */
export async function findSimilarSources(sourceId: number, limit: number = 5) {
  try {
    // Get the source and its tags
    const rawSource = await prisma.source.findUnique({
      where: { id: sourceId },
      select: { tags: true }
    })

    if (!rawSource) {
      return []
    }

    const sourceTags = JSON.parse(rawSource.tags) as string[]
    if (sourceTags.length === 0) {
      return []
    }

    // Get all sources except the current one
    const rawSources = await prisma.source.findMany({
      where: {
        id: { not: sourceId }
      },
      select: {
        id: true,
        title: true,
        url: true,
        category: true,
        summary_de: true,
        tags: true,
        language: true,
        relevance_score: true,
        corrected_score: true,
        star_rating: true
      }
    })

    // Parse tags for all sources
    const allSources = rawSources.map(s => ({
      ...s,
      tags: JSON.parse(s.tags) as string[]
    }))

    // Calculate similarity scores
    const scoredSources = allSources.map(otherSource => {
      let score = 0

      // Count tag overlaps
      const sharedTags = sourceTags.filter(tag => otherSource.tags.includes(tag))
      score += sharedTags.length * 10 // Base score for shared tags

      // Add co-occurrence bonus for shared tags
      for (const sharedTag of sharedTags) {
        score += 5
      }

      // Category match bonus
      // We can't directly compare categories without knowing the source's category
      // So we'll just use tag similarity for now

      return {
        ...otherSource,
        similarityScore: score
      }
    })

    // Sort by similarity score and take top results
    const similarSources = scoredSources
      .filter(s => s.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit)

    return similarSources
  } catch (error) {
    console.error('Failed to find similar sources:', error)
    return []
  }
}
