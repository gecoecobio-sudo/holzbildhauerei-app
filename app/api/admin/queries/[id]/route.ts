import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'processed') {
        updateData.date_processed = new Date()
      }
    }

    if (body.error_message !== undefined) {
      updateData.error_message = body.error_message
    }

    if (body.results_count !== undefined) {
      updateData.results_count = body.results_count
    }

    const updated = await prisma.searchQueue.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Failed to update query:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update query' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    await prisma.searchQueue.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete query:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete query' },
      { status: 500 }
    )
  }
}
