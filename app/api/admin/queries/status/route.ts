import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const queryId = parseInt(searchParams.get('queryId') || '0')

    if (!queryId) {
      return NextResponse.json({ error: 'Query ID required' }, { status: 400 })
    }

    const query = await prisma.searchQueue.findUnique({
      where: { id: queryId }
    })

    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 })
    }

    // Get sources count for this query
    const sourcesCount = await prisma.source.count({
      where: { source_query: query.query }
    })

    return NextResponse.json({
      id: query.id,
      status: query.status,
      results_count: query.results_count,
      sources_in_db: sourcesCount,
      date_processed: query.date_processed,
      error_message: query.error_message
    })
  } catch (error: any) {
    console.error('Failed to get query status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    )
  }
}
