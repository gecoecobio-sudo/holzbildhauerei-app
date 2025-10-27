import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const totalSources = await prisma.source.count()
    const starredSources = await prisma.source.count({
      where: { star_rating: true }
    })

    // Get all sources to calculate categories and languages
    const allSources = await prisma.source.findMany({
      select: {
        category: true,
        language: true
      }
    })

    // Count categories
    const categories: { [key: string]: number } = {}
    const languages: { [key: string]: number } = {}

    allSources.forEach(source => {
      categories[source.category] = (categories[source.category] || 0) + 1
      languages[source.language] = (languages[source.language] || 0) + 1
    })

    return NextResponse.json({
      totalSources,
      starredSources,
      categoriesCount: Object.keys(categories).length,
      languagesCount: Object.keys(languages).length,
      categories,
      languages
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
