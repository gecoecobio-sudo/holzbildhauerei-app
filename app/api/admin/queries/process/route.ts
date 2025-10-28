import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth'
import { searchWithSerper } from '@/lib/serper'
import { generateSourceMetadata } from '@/lib/gemini'
import { prisma } from '@/lib/db'
import { updateTagCooccurrences } from '@/lib/cooccurrence'

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

    // Get the query
    const query = await prisma.searchQueue.findUnique({
      where: { id: queryId }
    })

    if (!query) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      )
    }

    // Update status to processing
    await prisma.searchQueue.update({
      where: { id: queryId },
      data: { status: 'processing' }
    })

    try {
      // Search with Serper - Use 15 URLs for maximum quality coverage
      const urls = await searchWithSerper(query.query, 15)

      let successCount = 0
      const errors = []

      // Process each URL
      for (const url of urls) {
        try {
          // Check if query was cancelled
          const currentQuery = await prisma.searchQueue.findUnique({
            where: { id: queryId }
          })

          if (currentQuery?.status === 'failed') {
            console.log('Query processing cancelled by user')
            break
          }

          // Check if URL already exists
          const existing = await prisma.source.findFirst({
            where: { url }
          })

          if (existing) {
            continue
          }

          // Fetch page content with longer timeout for quality
          let content = ''
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout for quality

            const pageResponse = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              signal: controller.signal
            })

            clearTimeout(timeout)

            if (pageResponse.ok) {
              content = await pageResponse.text()
            }
          } catch (error) {
            console.log('Could not fetch page content for', url, error instanceof Error ? error.message : '')
          }

          // Generate metadata
          const metadata = await generateSourceMetadata(url, content)

          // Skip low-quality sources (score < 4)
          if (metadata.quality_score < 4) {
            console.log(`Skipping low-quality source (score ${metadata.quality_score}):`, url)
            continue
          }

          // Create source
          await prisma.source.create({
            data: {
              url,
              title: metadata.title,
              summary_de: metadata.summary_de,
              category: metadata.category,
              language: metadata.language,
              tags: JSON.stringify(metadata.tags),
              relevance_score: metadata.quality_score,
              star_rating: false,
              source_query: query.query
            }
          })

          // Update tag co-occurrences for similarity analysis
          if (metadata.tags && metadata.tags.length > 0) {
            await updateTagCooccurrences(metadata.tags)
          }

          successCount++
        } catch (error) {
          console.error('Failed to process URL:', url, error)
          errors.push({ url, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      // Update query status
      await prisma.searchQueue.update({
        where: { id: queryId },
        data: {
          status: 'processed',
          date_processed: new Date(),
          results_count: successCount,
          error_message: errors.length > 0 ? `${errors.length} errors occurred` : null
        }
      })

      return NextResponse.json({
        success: true,
        results_count: successCount,
        total_urls: urls.length,
        errors: errors.length
      })
    } catch (error: any) {
      // Update query with error
      await prisma.searchQueue.update({
        where: { id: queryId },
        data: {
          status: 'failed',
          error_message: error.message || 'Processing failed'
        }
      })

      throw error
    }
  } catch (error: any) {
    console.error('Failed to process query:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    )
  }
}
