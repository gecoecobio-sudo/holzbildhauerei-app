/**
 * Migrate sources from old database to new database
 */

import { PrismaClient } from '@prisma/client'
import * as path from 'path'

const oldDbPath = path.join(__dirname, '../../knowledge_sources.db')
const newDbPath = path.join(__dirname, '../knowledge_sources.db')

async function migrate() {
  // Connect to old database
  const oldPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${oldDbPath}`
      }
    }
  })

  // Connect to new database
  const newPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${newDbPath}`
      }
    }
  })

  try {
    console.log('Fetching sources from old database...')
    const oldSources = await oldPrisma.source.findMany()
    console.log(`Found ${oldSources.length} sources`)

    console.log('Checking existing sources in new database...')
    const existingUrls = new Set(
      (await newPrisma.source.findMany({ select: { url: true } })).map(s => s.url)
    )
    console.log(`${existingUrls.size} sources already exist`)

    let imported = 0
    let skipped = 0

    for (const source of oldSources) {
      if (existingUrls.has(source.url)) {
        skipped++
        continue
      }

      try {
        await newPrisma.source.create({
          data: {
            url: source.url,
            title: source.title,
            category: source.category,
            summary_de: source.summary_de,
            tags: source.tags,
            language: source.language,
            date_added: source.date_added,
            source_query: source.source_query,
            relevance_score: source.relevance_score,
            corrected_score: source.corrected_score,
            star_rating: source.star_rating || false,
            last_updated: source.last_updated
          }
        })
        imported++
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} sources...`)
        }
      } catch (error) {
        console.error(`Error importing ${source.url}:`, error)
      }
    }

    console.log(`\nMigration complete!`)
    console.log(`- Imported: ${imported}`)
    console.log(`- Skipped (already exist): ${skipped}`)
    console.log(`- Total: ${oldSources.length}`)

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await oldPrisma.$disconnect()
    await newPrisma.$disconnect()
  }
}

migrate()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
