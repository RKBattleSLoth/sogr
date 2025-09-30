import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Delete in correct order to respect foreign key constraints
    await db.interaction.deleteMany()
    await db.currentRole.deleteMany()
    await db.previousRole.deleteMany()
    await db.socialMediaHandle.deleteMany()
    await db.person.deleteMany()
    await db.organization.deleteMany()

    // Clear vector storage as well
    console.log('Clearing vector storage...')
    try {
      if (process.env.VECTOR_DATABASE_URL) {
        const { Client } = require('pg')
        const client = new Client({
          connectionString: process.env.VECTOR_DATABASE_URL
        })
        
        await client.connect()
        
        // Delete all embeddings from vector storage
        await client.query('TRUNCATE TABLE "interaction_embeddings" CASCADE')
        await client.query('TRUNCATE TABLE "search_cache" CASCADE')
        await client.query('TRUNCATE TABLE "interaction_clusters" CASCADE')
        await client.query('TRUNCATE TABLE "search_analytics" CASCADE')
        
        await client.end()
        console.log('✅ Vector storage cleared!')
      } else {
        console.log('⚠️ VECTOR_DATABASE_URL not set, skipping vector storage cleanup')
      }
    } catch (vectorError) {
      console.warn('⚠️ Could not clear vector storage:', vectorError)
      // Don't fail the whole operation if vector cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: 'All test data cleared successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error clearing test data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}