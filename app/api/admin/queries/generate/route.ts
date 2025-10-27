import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { generateSearchQueries } from '@/lib/gemini'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { topic, count } = await request.json()

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const queries = await generateSearchQueries(topic, count || 5)

    // Add all generated queries to the database
    const created = await Promise.all(
      queries.map(query =>
        prisma.searchQueue.create({
          data: {
            query,
            is_ai_generated: true,
            status: 'pending'
          }
        })
      )
    )

    return NextResponse.json({
      queries: created,
      count: created.length
    })
  } catch (error: any) {
    console.error('Failed to generate queries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate queries' },
      { status: 500 }
    )
  }
}
