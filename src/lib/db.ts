import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure we use the main schema for the primary database client
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:/Users/edwardbeshers/sogr/db/custom.db'
      }
    }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  console.log('Database URL:', process.env.DATABASE_URL)
  console.log('DB client initialized:', !!db)
  console.log('DB person model available:', !!db?.person)
}