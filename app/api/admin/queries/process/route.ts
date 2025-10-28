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
      // IMPORTANT: Vercel Serverless Functions have 60s timeout (Hobby plan)
      // With 3 URLs × (8s fetch + 3s Gemini + 1s DB) = ~36s total
      // This ensures we finish well under the 60s limit
      console.log(`[Query ${queryId}] Starting processing for: "${query.query}"`)
      const startTime = Date.now()

      // Search with Serper - Use 3 URLs (MUST finish under 60s serverless timeout!)
      console.log(`[Query ${queryId}] Searching with Serper...`)
      const urls = await searchWithSerper(query.query, 3)
      console.log(`[Query ${queryId}] Found ${urls.length} URLs:`, urls)

      let successCount = 0
      const errors = []

      // Process each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        const urlStartTime = Date.now()
        console.log(`[Query ${queryId}] Processing URL ${i + 1}/${urls.length}: ${url}`)

        try {
          // Check if query was cancelled
          const currentQuery = await prisma.searchQueue.findUnique({
            where: { id: queryId }
          })

          if (currentQuery?.status === 'failed') {
            console.log(`[Query ${queryId}] Cancelled by user`)
            break
          }

          // Check if URL already exists
          const existing = await prisma.source.findFirst({
            where: { url }
          })

          if (existing) {
            console.log(`[Query ${queryId}] URL ${i + 1}/${urls.length} already exists, skipping`)
            continue
          }

          // Fetch page content with timeout
          console.log(`[Query ${queryId}] Fetching content for URL ${i + 1}/${urls.length}...`)
          let content = ''
          const fetchStartTime = Date.now()
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout (fast, must stay under 60s total)

            const pageResponse = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              signal: controller.signal
            })

            clearTimeout(timeout)

            if (pageResponse.ok) {
              content = await pageResponse.text()
              console.log(`[Query ${queryId}] Fetched ${content.length} chars in ${Date.now() - fetchStartTime}ms`)
            }
          } catch (error) {
            console.log(`[Query ${queryId}] Failed to fetch URL ${i + 1}/${urls.length}:`, error instanceof Error ? error.message : 'Unknown error')
          }

          // Generate metadata
          console.log(`[Query ${queryId}] Generating metadata for URL ${i + 1}/${urls.length}...`)
          const metadataStartTime = Date.now()
          const metadata = await generateSourceMetadata(url, content)
          console.log(`[Query ${queryId}] Generated metadata in ${Date.now() - metadataStartTime}ms, score: ${metadata.quality_score}/10`)

          // Skip low-quality sources (score < 4)
          if (metadata.quality_score < 4) {
            console.log(`[Query ${queryId}] URL ${i + 1}/${urls.length} skipped (low quality: ${metadata.quality_score}/10)`)
            continue
          }

          // Create source
          console.log(`[Query ${queryId}] Saving URL ${i + 1}/${urls.length} to database...`)
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
          const urlTotalTime = Date.now() - urlStartTime
          console.log(`[Query ${queryId}] URL ${i + 1}/${urls.length} completed in ${urlTotalTime}ms (Success #${successCount})`)
        } catch (error) {
          console.error(`[Query ${queryId}] Failed to process URL ${i + 1}/${urls.length}:`, error)
          errors.push({ url, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`[Query ${queryId}] Processing complete! ${successCount} sources added in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)

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
