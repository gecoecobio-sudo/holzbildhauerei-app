import { NextRequest, NextResponse } from 'next/server'
import { findSimilarSources } from '@/lib/cooccurrence'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const similarSources = await findSimilarSources(id, 5)

    // Parse tags for response
    const parsed = similarSources.map(s => ({
      ...s,
      tags: typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags
    }))

    return NextResponse.json({ similar: parsed })
  } catch (error: any) {
    console.error('Failed to get similar sources:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get similar sources' },
      { status: 500 }
    )
  }
}
