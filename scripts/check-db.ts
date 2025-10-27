import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.source.count()
  console.log(`Total sources in database: ${count}`)

  if (count > 0) {
    const samples = await prisma.source.findMany({ take: 3 })
    console.log('\nSample entries:')
    samples.forEach(s => {
      console.log(`- ${s.title} (${s.category}, ${s.language})`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
