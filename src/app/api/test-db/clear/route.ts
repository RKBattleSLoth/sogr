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