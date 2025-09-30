// Vector database client - PostgreSQL for vector storage
import { PrismaClient } from '@prisma/client'

const globalForVectorPrisma = globalThis as unknown as {
  vectorPrisma: PrismaClient | undefined
}

// Vector database client using PostgreSQL with custom schema path
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
  console.log('Vector DB URL:', process.env.VECTOR_DATABASE_URL || 'postgresql://edwardbeshers@localhost:5432/vector_db')
}

export { vectorDb }