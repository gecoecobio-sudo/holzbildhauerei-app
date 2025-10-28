import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { queryId } = await request.json()

    if (!queryId) {
      return NextResponse.json(
        { error: 'Query ID is required' },
        { status: 400 }
      )
    }

    // Update query status to failed with cancellation message
    await prisma.searchQueue.update({
      where: { id: queryId },
      data: {
        status: 'failed',
        error_message: 'Verarbeitung vom Benutzer abgebrochen'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to cancel query:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel query' },
      { status: 500 }
    )
  }
}
