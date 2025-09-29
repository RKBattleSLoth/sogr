import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const organizations = await db.organization.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      organizations,
      count: organizations.length
    })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch organizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}