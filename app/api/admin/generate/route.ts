import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { generateSourceMetadata } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  const isAuth = await checkAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch the URL content (optional - could improve accuracy)
    let content = ''
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      if (pageResponse.ok) {
        content = await pageResponse.text()
      }
    } catch (error) {
      console.log('Could not fetch page content, using URL only')
    }

    const metadata = await generateSourceMetadata(url, content)

    return NextResponse.json(metadata)
  } catch (error: any) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate metadata' },
      { status: 500 }
    )
  }
}
