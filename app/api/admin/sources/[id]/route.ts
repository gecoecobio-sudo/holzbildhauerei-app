import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const sourceId = parseInt(id)
    const body = await request.json()

    const updateData: any = {}

    if ('corrected_score' in body) {
      updateData.corrected_score = body.corrected_score
    }
    if ('relevance_score' in body) {
      updateData.corrected_score = body.relevance_score
    }
    if ('star_rating' in body) {
      updateData.star_rating = body.star_rating
    }
    if ('title' in body) updateData.title = body.title
    if ('category' in body) updateData.category = body.category
    if ('summary_de' in body) updateData.summary_de = body.summary_de
    if ('tags' in body) updateData.tags = JSON.stringify(body.tags)
    if ('language' in body) updateData.language = body.language

    updateData.last_updated = new Date()

    const source = await prisma.source.update({
      where: { id: sourceId },
      data: updateData
    })

    return NextResponse.json({
      ...source,
      tags: JSON.parse(source.tags)
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const sourceId = parseInt(id)

    await prisma.source.delete({
      where: { id: sourceId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen' },
      { status: 500 }
    )
  }
}
