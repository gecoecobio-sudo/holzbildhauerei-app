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
      const rawUrls = await searchWithSerper(query.query, 3)
      console.log(`[Query ${queryId}] Raw URLs from Serper:`, rawUrls)

      // Remove duplicates from Serper results
      const urls = Array.from(new Set(rawUrls))
      if (rawUrls.length !== urls.length) {
        console.log(`[Query ${queryId}] Removed ${rawUrls.length - urls.length} duplicate URLs from Serper results`)
      }

      // Batch check: Which URLs already exist in DB?
      const existingUrls = await prisma.source.findMany({
        where: { url: { in: urls } },
        select: { url: true }
      })
      const existingUrlSet = new Set(existingUrls.map(s => s.url))

      // Filter to only new URLs
      const newUrls = urls.filter(url => !existingUrlSet.has(url))
      console.log(`[Query ${queryId}] URLs: ${urls.length} total, ${existingUrlSet.size} already in DB, ${newUrls.length} new to process`)

      let successCount = 0
      const errors = []
      const processedInThisRequest = new Set<string>() // Track URLs being processed in this request

      // Process each URL
      for (let i = 0; i < newUrls.length; i++) {
        const url = newUrls[i]
        const urlStartTime = Date.now()
        console.log(`[Query ${queryId}] Processing URL ${i + 1}/${newUrls.length}: ${url}`)

        try {
          // Check if query was cancelled
          const currentQuery = await prisma.searchQueue.findUnique({
            where: { id: queryId }
          })

          if (currentQuery?.status === 'failed') {
            console.log(`[Query ${queryId}] Cancelled by user`)
            break
          }

          // Double-check: already processed in this request?
          if (processedInThisRequest.has(url)) {
            console.log(`[Query ${queryId}] URL ${i + 1}/${newUrls.length} already processed in this request, skipping`)
            continue
          }

          // Mark as being processed
          processedInThisRequest.add(url)

          // Fetch page content with timeout
          console.log(`[Query ${queryId}] Fetching content for URL ${i + 1}/${newUrls.length}...`)
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
          console.log(`[Query ${queryId}] URL ${i + 1}/${newUrls.length} completed in ${urlTotalTime}ms (Success #${successCount})`)
        } catch (error) {
          console.error(`[Query ${queryId}] Failed to process URL ${i + 1}/${newUrls.length}:`, error)
          errors.push({ url, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      const totalTime = Date.now() - startTime
      console.log(`[Query ${queryId}] Processing complete! ${successCount} new sources added in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)

      // Count TOTAL sources for this query (not just newly added)
      const totalSourcesForQuery = await prisma.source.count({
        where: { source_query: query.query }
      })
      console.log(`[Query ${queryId}] Total sources for this query: ${totalSourcesForQuery}`)

      // Update query status
      await prisma.searchQueue.update({
        where: { id: queryId },
        data: {
          status: 'processed',
          date_processed: new Date(),
          results_count: totalSourcesForQuery,  // Total count, not just new ones
          error_message: errors.length > 0 ? `${errors.length} errors occurred` : null
        }
      })

      return NextResponse.json({
        success: true,
        new_sources_added: successCount,
        total_sources_for_query: totalSourcesForQuery,
        urls_checked: newUrls.length,
        urls_already_existed: existingUrlSet.size,
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
