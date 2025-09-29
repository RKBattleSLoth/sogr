// Vector database client - we'll use raw SQL queries for now
// since Prisma doesn't easily support multiple schemas in the same project

import { PrismaClient } from '@prisma/client'

const globalForVectorPrisma = globalThis as unknown as {
  vectorPrisma: any | undefined
}

// Vector database client using vector schema
const vectorDb = globalForVectorPrisma.vectorPrisma ??
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.VECTOR_DATABASE_URL || 'postgresql://edwardbeshers@localhost:5432/vector_db'
      }
    }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForVectorPrisma.vectorPrisma = vectorDb
  console.log('Vector DB client initialized:', !!vectorDb)
  console.log('Vector DB interactionEmbedding model available:', !!vectorDb?.interactionEmbedding)
}

export { vectorDb }