/**
 * Import sources from old database to current app database
 */

const Database = require('better-sqlite3');
const path = require('path');

const oldDbPath = path.join(__dirname, '../../knowledge_sources.db');
const newDbPath = path.join(__dirname, '../knowledge_sources.db');

console.log('Old DB:', oldDbPath);
console.log('New DB:', newDbPath);

try {
  // Open databases
  const oldDb = new Database(oldDbPath, { readonly: true });
  const newDb = new Database(newDbPath);

  // Check old database
  const oldCount = oldDb.prepare('SELECT COUNT(*) as count FROM sources').get();
  console.log(`\nOld database has ${oldCount.count} sources`);

  // Check new database
  const newCount = newDb.prepare('SELECT COUNT(*) as count FROM sources').get();
  console.log(`New database has ${newCount.count} sources`);

  // Get all sources from old database
  const sources = oldDb.prepare('SELECT * FROM sources').all();
  console.log(`\nFetched ${sources.length} sources from old database`);

  // Get existing URLs in new database
  const existingUrls = new Set(
    newDb.prepare('SELECT url FROM sources').all().map(s => s.url)
  );
  console.log(`${existingUrls.size} URLs already exist in new database`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Prepare insert statement
  const insert = newDb.prepare(`
    INSERT INTO sources (
      url, title, category, summary_de, tags, language,
      date_added, source_query, relevance_score, corrected_score,
      star_rating, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Import sources
  console.log('\nImporting sources...');
  const insertMany = newDb.transaction((sources) => {
    for (const source of sources) {
      if (existingUrls.has(source.url)) {
        skipped++;
        continue;
      }

      try {
        insert.run(
          source.url,
          source.title,
          source.category,
          source.summary_de,
          source.tags,
          source.language,
          source.date_added || new Date().toISOString(),
          source.source_query,
          source.relevance_score,
          source.corrected_score,
          source.star_rating || 0,
          source.last_updated || source.date_added || new Date().toISOString()
        );
        imported++;
        if (imported % 10 === 0) {
          process.stdout.write(`\rImported: ${imported}, Skipped: ${skipped}`);
        }
      } catch (error) {
        errors++;
        console.error(`\nError importing ${source.url}:`, error.message);
      }
    }
  });

  insertMany(sources);

  console.log(`\n\nImport complete!`);
  console.log(`- Imported: ${imported}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Errors: ${errors}`);
  console.log(`- Total in old DB: ${sources.length}`);

  // Verify
  const finalCount = newDb.prepare('SELECT COUNT(*) as count FROM sources').get();
  console.log(`\nNew database now has ${finalCount.count} sources`);

  oldDb.close();
  newDb.close();

  console.log('\nDone!');
  process.exit(0);

} catch (error) {
  console.error('\nFatal error:', error);
  process.exit(1);
}
