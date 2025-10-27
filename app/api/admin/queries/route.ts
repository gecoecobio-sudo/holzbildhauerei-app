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
    const status = searchParams.get('status')
    const aiGenerated = searchParams.get('ai_generated')
    const search = searchParams.get('search')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (aiGenerated === 'true') {
      where.is_ai_generated = true
    }

    if (search) {
      where.query = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const queries = await prisma.searchQueue.findMany({
      where,
      orderBy: [
        { date_added: 'desc' }
      ]
    })

    // Custom sort: pending -> processing -> error -> completed
    const statusOrder = { 'pending': 1, 'processing': 2, 'error': 3, 'completed': 4 }
    const sortedQueries = queries.sort((a, b) => {
      const orderA = statusOrder[a.status as keyof typeof statusOrder] || 999
      const orderB = statusOrder[b.status as keyof typeof statusOrder] || 999
      if (orderA !== orderB) return orderA - orderB
      // Same status: sort by date (newest first)
      return new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
    })

    return NextResponse.json({ queries: sortedQueries })
  } catch (error: any) {
    console.error('Failed to fetch queries:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch queries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { query, is_ai_generated } = body

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const newQuery = await prisma.searchQueue.create({
      data: {
        query: query.trim(),
        is_ai_generated: is_ai_generated || false,
        status: 'pending'
      }
    })

    return NextResponse.json(newQuery)
  } catch (error: any) {
    console.error('Failed to create query:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create query' },
      { status: 500 }
    )
  }
}
